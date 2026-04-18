import { Injectable, Logger } from "@nestjs/common";
import { GeminiService, ClinicalAnalysis } from "./services/gemini.service";
import { ElevenlabsService } from "./services/elevenlabs.service";

export interface ProcessingResult {
  analysis?: ClinicalAnalysis | null;
  audioBuffer?: Buffer;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private geminiService: GeminiService,
    private elevenlabsService: ElevenlabsService,
  ) {}

  /**
   * Pipeline completo: Dictado → Gemini (análisis SOAP) → ElevenLabs (síntesis de voz)
   * @param dictation Dictado médico crudo del doctor
   * @param context Contexto adicional (edad, antecedentes, etc.)
   * @param generateAudio Si se debe generar audio para el paciente
   * @returns Análisis clínico + audio buffer
   */
  async processClinicDictationWithAudio(
    dictation: string,
    context?: string,
    generateAudio: boolean = true,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      this.logger.log("🔄 Iniciando pipeline Gemini → ElevenLabs...");

      // PASO 1: Procesar dictado con Gemini
      this.logger.log("📝 Paso 1: Procesando dictado con Gemini...");
      const analysis = await this.geminiService.processClinicDictation(
        dictation,
        context,
      );

      let audioBuffer: Buffer | undefined;

      // PASO 2: Generar audio si es requerido
      if (generateAudio && analysis.version_paciente) {
        this.logger.log(
          "🎙️ Paso 2: Generando síntesis de voz para el paciente...",
        );

        try {
          audioBuffer = await this.elevenlabsService.synthesizeVoice(
            analysis.version_paciente,
          );
          this.logger.log(`✅ Audio generado: ${audioBuffer.length} bytes`);
        } catch (audioError) {
          this.logger.warn(
            `⚠️ No se pudo generar audio, pero el análisis se completó: ${audioError.message}`,
          );
          // No fallar el pipeline completo si ElevenLabs falla
        }
      }

      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `✨ Pipeline completado en ${processingTimeMs}ms. Triage: ${analysis.nivel_triage}/5`,
      );

      return {
        analysis,
        audioBuffer,
        processingTimeMs,
        success: true,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      this.logger.error(`❌ Error en pipeline: ${error.message}`, error.stack);

      return {
        analysis: null,
        audioBuffer: undefined,
        processingTimeMs,
        success: false,
        error: error.message || "Error desconocido en el procesamiento",
      };
    }
  }

  /**
   * Procesa solo el análisis sin generar audio (más rápido)
   */
  async processClinicDictationAnalysisOnly(
    dictation: string,
    context?: string,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      this.logger.log("📝 Procesando dictado (solo análisis)...");
      const analysis = await this.geminiService.processClinicDictation(
        dictation,
        context,
      );

      const processingTimeMs = Date.now() - startTime;

      return {
        analysis,
        processingTimeMs,
        success: true,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      this.logger.error(`❌ Error: ${error.message}`, error.stack);

      return {
        analysis: null,
        processingTimeMs,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera audio para un texto ya disponible
   * Útil para regenerar audio o para otros textos
   */
  async generateAudioFromText(text: string): Promise<Buffer> {
    if (!text || text.trim().length === 0) {
      throw new Error("El texto para síntesis de voz no puede estar vacío");
    }

    this.logger.log("🎙️ Sintetizando audio desde texto...");
    return await this.elevenlabsService.synthesizeVoice(text);
  }

  /**
   * Obtiene información de uso de ElevenLabs
   */
  async getElevenLabsQuota(): Promise<any> {
    this.logger.log("📊 Obteniendo información de quota de ElevenLabs...");
    return await this.elevenlabsService.getUserInfo();
  }

  /**
   * Obtiene voces disponibles en ElevenLabs
   */
  async getAvailableVoices(): Promise<any[]> {
    this.logger.log("📋 Obteniendo voces disponibles...");
    return await this.elevenlabsService.getAvailableVoices();
  }

  /**
   * Verifica salud del servicio
   */
  async healthCheck(): Promise<{ healthy: boolean; services: any }> {
    try {
      this.logger.log("🏥 Ejecutando health check...");

      const userInfo = await this.elevenlabsService.getUserInfo();

      return {
        healthy: !!userInfo,
        services: {
          gemini: "ready",
          elevenlabs: userInfo ? "ready" : "not_configured",
          remainingCharacters: userInfo
            ? userInfo.character_limit - userInfo.character_count
            : 0,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Health check falló: ${error.message}`);

      return {
        healthy: false,
        services: {
          gemini: "unknown",
          elevenlabs: "error",
          error: error.message,
        },
      };
    }
  }
}
