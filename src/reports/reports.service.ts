import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ClinicalReport,
  ClinicalReportDocument,
} from "./schemas/clinical-report.schema";
import { AudioService } from "./services/audio.service";
import {
  FeedbackService,
  FeedbackQuestion,
  FeedbackResponse,
} from "./services/feedback.service";
import { AiService } from "../ai/ai.service";
import { GeminiService } from "../ai/services/gemini.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { UploadAudioDto } from "./dto/upload-audio.dto";
import { ProcessAudioWithFeedbackDto } from "./dto/upload-audio.dto";

interface AudioProcessingPipeline {
  transcription: string;
  analysis: any;
  feedback: {
    questions: FeedbackQuestion[];
    questionsWithAudio: Array<{
      question: FeedbackQuestion;
      audioBase64: string;
    }>;
  };
  reportId: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(ClinicalReport.name)
    private reportModel: Model<ClinicalReportDocument>,
    private audioService: AudioService,
    private feedbackService: FeedbackService,
    private aiService: AiService,
    private geminiService: GeminiService,
  ) {}

  /**
   * Pipeline completo: Audio → Transcripción → Análisis → Retroalimentación
   */
  async processAudioWithCompletePipeline(
    audioBuffer: Buffer,
    dto: ProcessAudioWithFeedbackDto,
    audioFormat: string = "mp3",
  ): Promise<AudioProcessingPipeline> {
    const startTime = Date.now();

    try {
      this.logger.log("🎤 Iniciando pipeline completo de audio...");

      // PASO 1: Transcribir audio
      this.logger.log("📝 Paso 1: Transcribiendo audio...");
      const audioResult = await this.audioService.processAudioBuffer(
        audioBuffer,
        audioFormat,
        dto.context,
      );
      const transcription = audioResult.transcription.text;
      this.logger.log(
        `✅ Audio transcrito: ${transcription.substring(0, 100)}...`,
      );

      // PASO 2: Analizar con Gemini
      this.logger.log("🧠 Paso 2: Analizando con Gemini...");
      const analysisResult =
        await this.aiService.processClinicDictationWithAudio(
          transcription,
          dto.context,
          false, // No generar audio de Gemini
        );

      if (!analysisResult.success || !analysisResult.analysis) {
        throw new Error("Fallo en análisis de Gemini");
      }

      this.logger.log(
        `✅ Análisis completado. Triage: ${analysisResult.analysis.nivel_triage}`,
      );

      // PASO 3: Guardar reporte inicial
      this.logger.log("💾 Paso 3: Guardando reporte...");
      const report = await this.reportModel.create({
        patientId: dto.patientId,
        // TODO: Obtener doctorId del usuario autenticado (JWT)
        // doctorId se asignará desde el contexto de autenticación
        especialidad: dto.specialty || "General",
        resumen: analysisResult.analysis.resumen,
        diagnostico_presuntivo: analysisResult.analysis.diagnostico_presuntivo,
        soap: analysisResult.analysis.soap,
        triage: {
          nivel: analysisResult.analysis.nivel_triage,
          justificacion: analysisResult.analysis.nivel_triage_justificacion,
          evaluadoEn: new Date(),
        },
        version_paciente: analysisResult.analysis.version_paciente,
        hallazgos_criticos: analysisResult.analysis.hallazgos_criticos || [],
        dictadoOriginal: transcription,
        horasProcesamiento: analysisResult.processingTimeMs,
        estado: "procesado",
        unidadHospitalaria: dto.hospitalUnit || "Moscati Centro",
        procesadoEn: new Date(),
      });

      this.logger.log(`✅ Reporte guardado: ${report._id}`);

      // PASO 4: Generar preguntas de retroalimentación (opcional)
      let feedbackQuestions: FeedbackQuestion[] = [];
      let questionsWithAudio: Array<{
        question: FeedbackQuestion;
        audioBase64: string;
      }> = [];

      if (dto.generateFeedback !== false) {
        this.logger.log(
          "🤔 Paso 4: Generando preguntas de retroalimentación...",
        );

        feedbackQuestions =
          await this.feedbackService.generateFeedbackQuestions(
            analysisResult.analysis,
            dto.context,
          );

        this.logger.log(`✅ ${feedbackQuestions.length} preguntas generadas`);

        // PASO 5: Sintetizar preguntas en audio
        this.logger.log("🎙️ Paso 5: Sintetizando preguntas...");
        questionsWithAudio =
          await this.feedbackService.synthesizeMultipleFeedbackQuestions(
            feedbackQuestions,
          );

        this.logger.log(
          `✅ ${questionsWithAudio.length} preguntas sintetizadas`,
        );

        // Guardar preguntas en el reporte
        await this.reportModel.updateOne(
          { _id: report._id },
          {
            $set: {
              "metadata.feedbackQuestions": feedbackQuestions.map((q) => ({
                id: q.id,
                question: q.question,
                category: q.category,
                importance: q.importance,
              })),
            },
          },
        );
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(`✨ Pipeline completado en ${totalTime}ms`);

      return {
        transcription,
        analysis: analysisResult.analysis,
        feedback: {
          questions: feedbackQuestions,
          questionsWithAudio,
        },
        reportId: report._id.toString(),
      };
    } catch (error) {
      this.logger.error(`❌ Error en pipeline: ${error.message}`, error.stack);
      throw new BadRequestException(`Error procesando audio: ${error.message}`);
    }
  }

  /**
   * Procesa solo la transcripción de audio sin análisis
   */
  async transcribeAudioOnly(
    audioBuffer: Buffer,
    audioFormat: string = "mp3",
    context?: string,
  ): Promise<any> {
    try {
      this.logger.log("🎙️ Transcribiendo audio...");

      const result = await this.audioService.processAudioBuffer(
        audioBuffer,
        audioFormat,
        context,
      );

      return {
        success: true,
        transcription: result.transcription.text,
        audioSizeBytes: result.audioSizeBytes,
        processingTimeMs: result.processingTimeMs,
      };
    } catch (error) {
      this.logger.error(`❌ Error transcribiendo: ${error.message}`);
      throw new BadRequestException(`Error en transcripción: ${error.message}`);
    }
  }

  /**
   * Obtiene un reporte por ID
   */
  async findOne(id: string): Promise<any> {
    try {
      const report = await this.reportModel.findById(id).lean();

      if (!report) {
        throw new BadRequestException(`Reporte no encontrado: ${id}`);
      }

      return {
        success: true,
        report,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo reporte: ${error.message}`);
      throw new BadRequestException(
        `Error obteniendo reporte: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene reportes de un paciente
   */
  async findByPatient(patientId: string): Promise<any> {
    try {
      this.logger.log(`📋 Obteniendo reportes del paciente: ${patientId}`);

      const reports = await this.reportModel
        .find({ patientId })
        .sort({ procesadoEn: -1 })
        .lean();

      this.logger.log(`✅ ${reports.length} reportes encontrados`);

      return {
        success: true,
        count: reports.length,
        reports,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo reportes: ${error.message}`);
      throw new BadRequestException(
        `Error obteniendo reportes: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene reportes de un médico
   */
  async findByDoctor(doctorId: string): Promise<any> {
    try {
      this.logger.log(`📋 Obteniendo reportes del médico: ${doctorId}`);

      const reports = await this.reportModel
        .find({ doctorId })
        .sort({ procesadoEn: -1 })
        .lean();

      return {
        success: true,
        count: reports.length,
        reports,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo reportes: ${error.message}`);
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los reportes
   */
  async findAll(limit: number = 50, skip: number = 0): Promise<any> {
    try {
      this.logger.log(
        `📋 Obteniendo reportes (limit: ${limit}, skip: ${skip})`,
      );

      const reports = await this.reportModel
        .find()
        .sort({ procesadoEn: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await this.reportModel.countDocuments();

      return {
        success: true,
        total,
        count: reports.length,
        reports,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo reportes: ${error.message}`);
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  /**
   * Envía respuestas a las preguntas de retroalimentación
   */
  async submitFeedbackResponses(
    reportId: string,
    responses: Array<{ questionId: string; answer: string }>,
  ): Promise<any> {
    try {
      this.logger.log(
        `💬 Procesando respuestas de retroalimentación para reporte: ${reportId}`,
      );

      // Obtener el reporte
      const report = await this.reportModel.findById(reportId);

      if (!report) {
        throw new BadRequestException(`Reporte no encontrado: ${reportId}`);
      }

      // Obtener las preguntas guardadas
      const feedbackQuestions = report.metadata?.feedbackQuestions || [];

      if (feedbackQuestions.length === 0) {
        throw new BadRequestException(
          `No hay preguntas de retroalimentación para este reporte`,
        );
      }

      // Procesar respuestas
      const feedbackResponses: FeedbackResponse[] = responses.map((r) => ({
        questionId: r.questionId,
        answer: r.answer,
        timestamp: new Date(),
      }));

      const validationResult =
        await this.feedbackService.processFeedbackResponses(
          feedbackQuestions,
          feedbackResponses,
        );

      // Guardar respuestas y validación en el reporte
      await this.reportModel.updateOne(
        { _id: reportId },
        {
          $set: {
            "metadata.feedbackResponses": responses,
            "metadata.validationResult": validationResult,
            "metadata.feedbackProcessedAt": new Date(),
          },
        },
      );

      this.logger.log(
        `✅ Respuestas guardadas. Validity Score: ${validationResult.validityScore}`,
      );

      return {
        success: true,
        validityScore: validationResult.validityScore,
        criticalIssues: validationResult.criticalIssues || [],
        recommendations: validationResult.recommendations || [],
        summaryText: validationResult.summaryText,
        requiresImmediateAction: validationResult.requiresImmediateAction,
      };
    } catch (error) {
      this.logger.error(`❌ Error procesando respuestas: ${error.message}`);
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de reportes
   */
  async getStatistics(): Promise<any> {
    try {
      this.logger.log("📊 Generando estadísticas de reportes...");

      const stats = await this.reportModel.aggregate([
        {
          $group: {
            _id: null,
            totalReports: { $sum: 1 },
            avgTriageLevel: { $avg: "$triage.nivel" },
            bySpecialty: {
              $push: {
                specialty: "$especialidad",
                count: 1,
              },
            },
            byStatus: {
              $push: {
                status: "$estado",
              },
            },
          },
        },
      ]);

      return {
        success: true,
        statistics: stats[0] || {
          totalReports: 0,
          avgTriageLevel: 0,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo estadísticas: ${error.message}`);
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  /**
   * Actualiza un reporte
   */
  async update(id: string, updateReportDto: UpdateReportDto): Promise<any> {
    try {
      this.logger.log(`📝 Actualizando reporte: ${id}`);

      const updated = await this.reportModel.findByIdAndUpdate(
        id,
        { $set: updateReportDto },
        { new: true },
      );

      if (!updated) {
        throw new BadRequestException(`Reporte no encontrado: ${id}`);
      }

      this.logger.log(`✅ Reporte actualizado`);

      return {
        success: true,
        report: updated,
      };
    } catch (error) {
      this.logger.error(`❌ Error actualizando reporte: ${error.message}`);
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  /**
   * Elimina un reporte
   */
  async remove(id: string): Promise<any> {
    try {
      this.logger.log(`🗑️ Eliminando reporte: ${id}`);

      const deleted = await this.reportModel.findByIdAndDelete(id);

      if (!deleted) {
        throw new BadRequestException(`Reporte no encontrado: ${id}`);
      }

      this.logger.log(`✅ Reporte eliminado`);

      return {
        success: true,
        message: "Reporte eliminado exitosamente",
      };
    } catch (error) {
      this.logger.error(`❌ Error eliminando reporte: ${error.message}`);
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  /**
   * Marca un reporte como revisado por médico
   */
  async markAsReviewed(
    reportId: string,
    medicoRevisorId: string,
    notes?: string,
  ): Promise<any> {
    try {
      this.logger.log(`✏️ Marcando reporte como revisado: ${reportId}`);

      const updated = await this.reportModel.findByIdAndUpdate(
        reportId,
        {
          $set: {
            revisadoPorMedico: true,
            medicoRevisor: medicoRevisorId,
            fechaRevisionMedico: new Date(),
            notas: notes,
          },
        },
        { new: true },
      );

      if (!updated) {
        throw new BadRequestException(`Reporte no encontrado: ${reportId}`);
      }

      this.logger.log(`✅ Reporte marcado como revisado`);

      return {
        success: true,
        report: updated,
      };
    } catch (error) {
      this.logger.error(`❌ Error marcando como revisado: ${error.message}`);
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  /**
   * Obtiene reportes críticos (triage 4-5)
   */
  async getCriticalReports(): Promise<any> {
    try {
      this.logger.log("🚨 Obteniendo reportes críticos...");

      const criticalReports = await this.reportModel
        .find({
          "triage.nivel": { $gte: 4 },
          estado: { $ne: "archived" },
        })
        .sort({ procesadoEn: -1 })
        .lean();

      this.logger.log(
        `✅ ${criticalReports.length} reportes críticos encontrados`,
      );

      return {
        success: true,
        count: criticalReports.length,
        reports: criticalReports,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error obteniendo reportes críticos: ${error.message}`,
      );
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }
}
