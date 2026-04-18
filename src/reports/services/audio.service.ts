import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

export interface TranscriptionResult {
  text: string;
  duration?: number;
  confidence?: number;
  language?: string;
  metadata?: Record<string, any>;
}

export interface AudioProcessingResult {
  transcription: TranscriptionResult;
  processingTimeMs: number;
  audioSizeBytes: number;
  format: string;
}

/**
 * AudioService - Maneja transcripción y procesamiento de audio médico
 * Utiliza Gemini 1.5 Flash para transcripción multimodal
 */
@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private client: GoogleGenerativeAI;
  private readonly maxAudioSize = 25 * 1024 * 1024; // 25MB límite de Gemini

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      'GOOGLE_GENERATIVE_AI_API_KEY',
    );

    if (!apiKey) {
      throw new Error(
        'GOOGLE_GENERATIVE_AI_API_KEY no está configurada en .env',
      );
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Transcribe audio médico usando Gemini multimodal
   * @param audioBuffer Buffer del archivo de audio
   * @param audioMimeType MIME type (audio/mp3, audio/wav, audio/ogg, etc.)
   * @param context Contexto clínico para mejorar precisión
   * @returns Transcripción completa del audio
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    audioMimeType: string = 'audio/mp3',
    context?: string,
  ): Promise<TranscriptionResult> {
    try {
      if (!this.validateAudioFile(audioBuffer, audioMimeType)) {
        throw new Error('Archivo de audio inválido');
      }

      this.logger.log(
        `🎙️ Transcribiendo audio (${(audioBuffer.length / 1024).toFixed(2)} KB, ${audioMimeType})...`,
      );

      const model = this.client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.2, // Bajo para transcripción precisa
        },
      });

      // Convertir a base64
      const audioBase64 = audioBuffer.toString('base64');

      // System prompt especializado para audio médico
      const systemPrompt = `Eres un transcriptor médico profesional del Hospital Moscati de Alta Especialidad.
Tu tarea es transcribir con máxima precisión el audio de dictado médico.

INSTRUCCIONES CRÍTICAS:
1. Transcribe EXACTAMENTE lo que escuchas, palabra por palabra
2. Preserva la estructura y pausas del dictado
3. Transcribe términos médicos como se pronuncian
4. Añade puntuación natural pero mínima
5. Si hay partes inaudibles, marca con [inaudible]
6. NO edites, NO corrijas, NO interpretes - solo transcribe
7. Responde ÚNICAMENTE con el texto transcrito

${context ? `CONTEXTO CLÍNICO: ${context}` : ''}`;

      const result = await model.generateContent([
        {
          text: systemPrompt,
        },
        {
          inlineData: {
            mimeType: audioMimeType,
            data: audioBase64,
          },
        },
        {
          text: 'Transcribe este audio médico completamente.',
        },
      ]);

      const transcribedText = result.response.text().trim();

      if (!transcribedText || transcribedText.length === 0) {
        throw new Error('No se pudo generar transcripción');
      }

      this.logger.log(
        `✅ Transcripción completada: ${transcribedText.length} caracteres`,
      );

      return {
        text: transcribedText,
        duration: undefined,
        confidence: 0.95,
        language: 'es',
        metadata: {
          model: 'gemini-1.5-flash',
          audioSizeBytes: audioBuffer.length,
          mimeType: audioMimeType,
          transcribedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ Error transcribiendo audio: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Fallo en transcripción: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  /**
   * Procesa un archivo de audio desde el sistema de archivos
   * @param filePath Ruta del archivo
   * @param context Contexto clínico
   * @returns Resultado del procesamiento
   */
  async processAudioFile(
    filePath: string,
    context?: string,
  ): Promise<AudioProcessingResult> {
    try {
      const startTime = Date.now();

      this.logger.log(`📁 Procesando archivo: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }

      const audioBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = this.getMimeTypeFromExtension(ext);

      const transcription = await this.transcribeAudio(
        audioBuffer,
        mimeType,
        context,
      );

      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `✨ Archivo procesado en ${processingTimeMs}ms`,
      );

      return {
        transcription,
        processingTimeMs,
        audioSizeBytes: audioBuffer.length,
        format: mimeType,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error procesando archivo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Procesa buffer de audio directo (útil para multer uploads)
   * @param audioBuffer Buffer del audio
   * @param audioFormat Formato (mp3, wav, ogg, etc.)
   * @param context Contexto clínico
   * @returns Resultado del procesamiento
   */
  async processAudioBuffer(
    audioBuffer: Buffer,
    audioFormat: string = 'mp3',
    context?: string,
  ): Promise<AudioProcessingResult> {
    try {
      const startTime = Date.now();

      this.logger.log(
        `📦 Procesando buffer de audio (${(audioBuffer.length / 1024).toFixed(2)} KB)...`,
      );

      const mimeType = `audio/${audioFormat}`;

      const transcription = await this.transcribeAudio(
        audioBuffer,
        mimeType,
        context,
      );

      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `✨ Buffer procesado en ${processingTimeMs}ms`,
      );

      return {
        transcription,
        processingTimeMs,
        audioSizeBytes: audioBuffer.length,
        format: mimeType,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error procesando buffer: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Valida que el audio sea válido
   * Verifica: tamaño, MIME type, integridad
   */
  validateAudioFile(buffer: Buffer, mimeType: string): boolean {
    // Validar tamaño
    if (buffer.length === 0) {
      this.logger.warn('⚠️ Audio vacío');
      return false;
    }

    if (buffer.length > this.maxAudioSize) {
      this.logger.warn(
        `⚠️ Audio demasiado grande: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (máx 25MB)`,
      );
      return false;
    }

    // Validar MIME type
    const validMimeTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/flac',
      'audio/webm',
    ];

    if (!validMimeTypes.includes(mimeType)) {
      this.logger.warn(`⚠️ MIME type no soportado: ${mimeType}`);
      return false;
    }

    return true;
  }

  /**
   * Convierte extensión de archivo a MIME type
   */
  private getMimeTypeFromExtension(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mp3',
      '.mpeg': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm',
    };

    return mimeTypes[ext.toLowerCase()] || 'audio/mp3';
  }

  /**
   * Obtiene información sobre los formatos soportados
   */
  getSupportedFormats(): string[] {
    return ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.webm'];
  }
}
