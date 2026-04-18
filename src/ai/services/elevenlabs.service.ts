import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

/**
 * Servicio para síntesis de voz con ElevenLabs
 * Convierte texto clínico en audio empático para pacientes
 */
@Injectable()
export class ElevenlabsService {
  private readonly logger = new Logger(ElevenlabsService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl = "https://api.elevenlabs.io/v1";
  private readonly voiceId: string;
  private readonly stability: number;
  private readonly similarityBoost: number;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("ELEVENLABS_API_KEY");

    if (!this.apiKey) {
      this.logger.warn(
        "⚠️ ELEVENLABS_API_KEY no configurada. El servicio de síntesis de voz estará deshabilitado.",
      );
    }

    this.voiceId = this.configService.get<string>(
      "ELEVENLABS_VOICE_ID",
      "W5JElH3dK1UYYAiHH7uh", // Voice ID válido de ElevenLabs (...)
    );
    this.stability = parseFloat(
      this.configService.get<string>("ELEVENLABS_STABILITY", "0.5"),
    );
    this.similarityBoost = parseFloat(
      this.configService.get<string>("ELEVENLABS_CLARITY", "0.75"),
    );
  }

  /**
   * Sintetiza texto en audio usando ElevenLabs
   * Devuelve un buffer MP3 listo para reproducción o streaming
   * @param text Texto a convertir en audio (máx 5000 caracteres)
   * @returns Buffer de audio en formato MP3
   */
  async synthesizeVoice(text: string): Promise<Buffer> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error("El texto para síntesis de voz no puede estar vacío");
      }

      if (!this.apiKey) {
        throw new Error(
          "ELEVENLABS_API_KEY no está configurada. No se puede sintetizar audio.",
        );
      }

      if (text.length > 5000) {
        this.logger.warn(
          `⚠️ Texto muy largo (${text.length} chars), truncando a 5000`,
        );
        text = text.substring(0, 5000);
      }

      this.logger.log(
        `🎙️ Sintetizando voz (${text.length} caracteres) con voz: ${this.voiceId}...`,
      );

      const response = await axios.post(
        `${this.apiUrl}/text-to-speech/${this.voiceId}`,
        {
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: this.stability,
            similarity_boost: this.similarityBoost,
          },
        },
        {
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 30000,
        },
      );

      const buffer = Buffer.from(response.data);

      this.logger.log(
        `✅ Audio generado exitosamente. Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`,
      );

      return buffer;
    } catch (error) {
      this.logger.error(
        `❌ Error sintetizando voz: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Fallo en síntesis de voz: ${error.message || "Error desconocido"}`,
      );
    }
  }

  /**
   * Sintetiza voz en stream (más eficiente para textos largos)
   * @param text Texto a convertir
   * @returns Buffer de audio
   */
  async synthesizeVoiceStream(text: string): Promise<Buffer> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error("El texto para síntesis de voz no puede estar vacío");
      }

      if (!this.apiKey) {
        throw new Error("ELEVENLABS_API_KEY no está configurada");
      }

      this.logger.log("🎙️ Generando stream de audio...");

      const response = await axios.post(
        `${this.apiUrl}/text-to-speech/${this.voiceId}/stream`,
        {
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: this.stability,
            similarity_boost: this.similarityBoost,
          },
        },
        {
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 30000,
        },
      );

      const buffer = Buffer.from(response.data);
      this.logger.log(
        `✅ Stream de audio generado. Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`,
      );

      return buffer;
    } catch (error) {
      this.logger.error(
        `❌ Error generando stream de audio: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Fallo en stream de audio: ${error.message || "Error desconocido"}`,
      );
    }
  }

  /**
   * Obtiene las voces disponibles en ElevenLabs
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      if (!this.apiKey) {
        this.logger.warn(
          "⚠️ API Key no configurada. No se pueden obtener voces.",
        );
        return [];
      }

      this.logger.log("📋 Obteniendo voces disponibles...");

      const response = await axios.get(`${this.apiUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
        timeout: 10000,
      });

      const voices = response.data.voices || [];
      this.logger.log(`✅ Se encontraron ${voices.length} voces disponibles`);

      return voices;
    } catch (error) {
      this.logger.error(
        `❌ Error obteniendo voces: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Obtiene información del usuario (quota, caracteres restantes)
   */
  async getUserInfo(): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error("ELEVENLABS_API_KEY no está configurada");
      }

      this.logger.log("👤 Obteniendo información del usuario...");

      const response = await axios.get(`${this.apiUrl}/user`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
        timeout: 10000,
      });

      const charCount = response.data.character_count || 0;
      const charLimit = response.data.character_limit || 0;
      const remaining = charLimit - charCount;

      this.logger.log(
        `✅ Usuario: ${response.data.first_name} | Caracteres usados: ${charCount}/${charLimit} | Restantes: ${remaining}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `❌ Error obteniendo información: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifica si hay suficientes caracteres para una síntesis
   */
  async canSynthesize(textLength: number): Promise<boolean> {
    try {
      const userInfo = await this.getUserInfo();
      const charLimit = userInfo.character_limit || 0;
      const charCount = userInfo.character_count || 0;
      const remaining = charLimit - charCount;

      if (remaining < textLength) {
        this.logger.warn(
          `⚠️ Caracteres insuficientes. Necesarios: ${textLength}, Disponibles: ${remaining}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `⚠️ No se pudo verificar cuota: ${error.message}. Permitiendo síntesis.`,
      );
      return true; // Permitir intentar
    }
  }
}
