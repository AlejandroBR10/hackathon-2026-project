import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { AiService } from "./ai.service";
import { ProcessScribingDto } from "./dto/process-scribing.dto";

@Controller("ai")
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * 🔥 ENDPOINT PRINCIPAL: Procesa dictado médico completo
   * Gemini (análisis SOAP) → ElevenLabs (síntesis de voz)
   *
   * POST /ai/process
   * Body: ProcessScribingDto
   * Response: { analysis, audioBuffer, processingTime, status }
   */
  @Post("process")
  async processClinicDictation(@Body() dto: ProcessScribingDto) {
    try {
      this.logger.log(`📋 Procesando dictado del doctor: ${dto.doctorId}`);

      const result = await this.aiService.processClinicDictationWithAudio(
        dto.dictation,
        dto.context,
        true, // generateAudio = true
      );

      if (!result.success || !result.analysis) {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: "Error procesando dictado",
            error: result.error,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Convertir audio buffer a base64 para respuesta JSON
      const audioBase64 = result.audioBuffer
        ? result.audioBuffer.toString("base64")
        : null;

      return {
        success: true,
        processingTimeMs: result.processingTimeMs,
        analysis: {
          resumen: result.analysis.resumen,
          soap: result.analysis.soap,
          diagnostico_presuntivo: result.analysis.diagnostico_presuntivo,
          nivel_triage: result.analysis.nivel_triage,
          nivel_triage_justificacion:
            result.analysis.nivel_triage_justificacion,
          especialidad: result.analysis.especialidad,
          version_paciente: result.analysis.version_paciente,
          hallazgos_criticos: result.analysis.hallazgos_criticos || [],
        },
        audio: {
          available: !!audioBase64,
          format: "base64-mp3",
          data: audioBase64,
          sizeBytes: result.audioBuffer?.length || 0,
        },
        message: `✅ Análisis completado en ${result.processingTimeMs}ms. Triage: ${result.analysis.nivel_triage}/5`,
      };
    } catch (error) {
      this.logger.error(`❌ Error en procesamiento: ${error.message}`);

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Error procesando dictado médico",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ⚡ VERSIÓN RÁPIDA: Solo análisis sin audio
   * Útil para verificaciones rápidas sin gastar cuota de ElevenLabs
   *
   * POST /ai/analyze
   * Body: ProcessScribingDto
   * Response: { analysis, processingTime }
   */
  @Post("analyze")
  async analyzeClinicDictation(@Body() dto: ProcessScribingDto) {
    try {
      this.logger.log(`📊 Analizando dictado (sin audio)...`);

      const result = await this.aiService.processClinicDictationAnalysisOnly(
        dto.dictation,
        dto.context,
      );

      if (!result.success || !result.analysis) {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: "Error analizando dictado",
            error: result.error,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        processingTimeMs: result.processingTimeMs,
        analysis: result.analysis,
        message: `✅ Análisis completado en ${result.processingTimeMs}ms`,
      };
    } catch (error) {
      this.logger.error(`❌ Error en análisis: ${error.message}`);

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Error analizando dictado",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🎙️ SINTETIZAR AUDIO: Genera audio desde texto
   * Útil para regenerar audio de un texto existente
   *
   * POST /ai/synthesize
   * Body: { text: string }
   * Response: { audio: base64-encoded mp3 }
   */
  @Post("synthesize")
  async synthesizeAudio(@Body() body: { text: string }) {
    try {
      if (!body.text || body.text.trim().length === 0) {
        throw new BadRequestException(
          "El texto para síntesis de voz no puede estar vacío",
        );
      }

      this.logger.log(
        `🎙️ Sintetizando audio (${body.text.length} caracteres)...`,
      );

      const audioBuffer = await this.aiService.generateAudioFromText(body.text);

      const audioBase64 = audioBuffer.toString("base64");

      return {
        success: true,
        audio: {
          format: "base64-mp3",
          data: audioBase64,
          sizeBytes: audioBuffer.length,
        },
        message: "✅ Audio sintetizado correctamente",
      };
    } catch (error) {
      this.logger.error(`❌ Error sintetizando audio: ${error.message}`);

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Error sintetizando audio",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📋 VOCES DISPONIBLES: Lista las voces en ElevenLabs
   *
   * GET /ai/voices
   * Response: { voices: [...] }
   */
  @Get("voices")
  async getAvailableVoices() {
    try {
      this.logger.log("📋 Obteniendo voces disponibles...");

      const voices = await this.aiService.getAvailableVoices();

      return {
        success: true,
        count: voices.length,
        voices: voices.map((v) => ({
          id: v.voice_id,
          name: v.name,
          category: v.category,
          description: v.description,
          preview_url: v.preview_url,
        })),
        message: `✅ Se encontraron ${voices.length} voces disponibles`,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo voces: ${error.message}`);

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Error obteniendo voces",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📊 INFORMACIÓN DE CUOTA: Obtiene uso de ElevenLabs
   *
   * GET /ai/quota
   * Response: { characterCount, characterLimit, remaining }
   */
  @Get("quota")
  async getElevenLabsQuota() {
    try {
      this.logger.log("📊 Obteniendo información de quota...");

      const userInfo = await this.aiService.getElevenLabsQuota();

      if (!userInfo) {
        throw new HttpException(
          {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            message: "ElevenLabs no configurado",
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const remaining = userInfo.character_limit - userInfo.character_count;
      const percentageUsed = Math.round(
        (userInfo.character_count / userInfo.character_limit) * 100,
      );

      return {
        success: true,
        user: {
          name: userInfo.first_name || "Unknown",
          email: userInfo.email || "Unknown",
          subscription: userInfo.subscription_tier || "free",
        },
        quota: {
          characterCount: userInfo.character_count,
          characterLimit: userInfo.character_limit,
          remaining: remaining,
          percentageUsed: percentageUsed,
          percentageRemaining: 100 - percentageUsed,
        },
        message: `✅ Cuota: ${remaining}/${userInfo.character_limit} caracteres disponibles (${percentageUsed}% usado)`,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo quota: ${error.message}`);

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Error obteniendo información de quota",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🏥 HEALTH CHECK: Verifica estado de los servicios
   *
   * GET /ai/health
   * Response: { healthy: boolean, services: {...} }
   */
  @Get("health")
  async healthCheck() {
    try {
      this.logger.log("🏥 Ejecutando health check...");

      const health = await this.aiService.healthCheck();

      return {
        healthy: health.healthy,
        timestamp: new Date().toISOString(),
        services: health.services,
        message: health.healthy
          ? "✅ Todos los servicios operacionales"
          : "⚠️ Algunos servicios no están disponibles",
      };
    } catch (error) {
      this.logger.error(`❌ Error en health check: ${error.message}`);

      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error.message,
        message: "❌ Error ejecutando health check",
      };
    }
  }

  /**
   * 🔍 PRUEBA: Endpoint para testing rápido
   *
   * GET /ai/test
   * Response: { message: "¡El servicio de IA está operacional!" }
   */
  @Get("test")
  async testEndpoint() {
    this.logger.log("✅ Test endpoint invocado");

    return {
      status: "operational",
      message: "✅ El servicio de IA está operacional",
      timestamp: new Date().toISOString(),
      endpoints: {
        "POST /ai/process": "Procesar dictado completo (análisis + audio)",
        "POST /ai/analyze": "Solo análisis clínico (sin audio)",
        "POST /ai/synthesize": "Generar audio desde texto",
        "GET /ai/voices": "Listar voces disponibles",
        "GET /ai/quota": "Información de cuota de ElevenLabs",
        "GET /ai/health": "Estado de los servicios",
        "GET /ai/test": "Test de conectividad",
      },
    };
  }
}
