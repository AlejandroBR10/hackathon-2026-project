import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import {
  UploadAudioDto,
  ProcessAudioWithFeedbackDto,
  SubmitFeedbackResponseDto,
} from "./dto/upload-audio.dto";

@Controller("reports")
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * 🎙️ ENDPOINT PRINCIPAL: Sube audio, lo transcribe, analiza y genera retroalimentación
   * POST /reports/upload-audio-with-feedback
   */
  @Post("upload-audio-with-feedback")
  @UseInterceptors(FileInterceptor("audio"))
  @HttpCode(HttpStatus.OK)
  async uploadAudioWithFeedback(
    @UploadedFile() file: any,
    @Body() dto: ProcessAudioWithFeedbackDto,
  ) {
    try {
      if (!file) {
        throw new BadRequestException("Se requiere un archivo de audio");
      }

      this.logger.log(
        `📥 Recibido audio (${(file.size / 1024).toFixed(2)} KB) del paciente: ${dto.patientId}`,
      );

      const audioFormat = this.getAudioFormatFromMimeType(file.mimetype);

      const result = await this.reportsService.processAudioWithCompletePipeline(
        file.buffer,
        dto,
        audioFormat,
      );

      return {
        success: true,
        reportId: result.reportId,
        transcription: result.transcription,
        analysis: result.analysis,
        feedbackQuestions: result.feedback.questions,
        feedbackQuestionsWithAudio: result.feedback.questionsWithAudio.map(
          (qa: any) => ({
            questionId: qa.question.id,
            question: qa.question.question,
            category: qa.question.category,
            importance: qa.question.importance,
            audioBase64: qa.audioBase64,
          }),
        ),
        message: `✅ Audio procesado. ${result.feedback.questions.length} preguntas de retroalimentación generadas.`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error procesando audio: ${error.message}`);
      throw new InternalServerErrorException(
        `Error procesando audio: ${error.message}`,
      );
    }
  }

  /**
   * ⚡ VERSIÓN RÁPIDA: Solo transcripción de audio
   * POST /reports/transcribe-audio
   */
  @Post("transcribe-audio")
  @UseInterceptors(FileInterceptor("audio"))
  @HttpCode(HttpStatus.OK)
  async transcribeAudioOnly(
    @UploadedFile() file: any,
    @Body() dto: { context?: string },
  ) {
    try {
      if (!file) {
        throw new BadRequestException("Se requiere un archivo de audio");
      }

      this.logger.log(
        `📝 Transcribiendo audio (${(file.size / 1024).toFixed(2)} KB)...`,
      );

      const audioFormat = this.getAudioFormatFromMimeType(file.mimetype);

      const result = await this.reportsService.transcribeAudioOnly(
        file.buffer,
        audioFormat,
        dto.context,
      );

      return {
        success: true,
        ...result,
        message: `✅ Audio transcrito correctamente`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error transcribiendo: ${error.message}`);
      throw new InternalServerErrorException(
        `Error en transcripción: ${error.message}`,
      );
    }
  }

  /**
   * 📝 Procesa dictado directo (sin archivo de audio)
   * POST /reports/process-dictation-with-feedback
   */
  @Post("process-dictation-with-feedback")
  @HttpCode(HttpStatus.OK)
  async processDictationWithFeedback(@Body() dto: ProcessAudioWithFeedbackDto) {
    try {
      if (!dto.transcription || dto.transcription.trim().length === 0) {
        throw new BadRequestException("La transcripción es requerida");
      }

      this.logger.log(
        `📝 Procesando dictado directo del paciente: ${dto.patientId}`,
      );

      const result = await this.reportsService.processAudioWithCompletePipeline(
        Buffer.from(dto.transcription),
        dto,
        "text",
      );

      return {
        success: true,
        reportId: result.reportId,
        transcription: result.transcription,
        analysis: result.analysis,
        feedbackQuestions: result.feedback.questions,
        feedbackQuestionsWithAudio: result.feedback.questionsWithAudio,
        message: `✅ Dictado procesado exitosamente`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error procesando dictado: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 💬 Envía respuestas a las preguntas de retroalimentación
   * POST /reports/:reportId/submit-feedback
   */
  @Post(":reportId/submit-feedback")
  @HttpCode(HttpStatus.OK)
  async submitFeedbackResponses(
    @Param("reportId") reportId: string,
    @Body() dto: { responses: Array<{ questionId: string; answer: string }> },
  ) {
    try {
      if (!dto.responses || dto.responses.length === 0) {
        throw new BadRequestException("Se requieren respuestas");
      }

      this.logger.log(`💬 Recibiendo respuestas para reporte: ${reportId}`);

      const result = await this.reportsService.submitFeedbackResponses(
        reportId,
        dto.responses,
      );

      return {
        success: true,
        ...result,
        message: `✅ Retroalimentación procesada. Validez: ${result.validityScore}%`,
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Error procesando retroalimentación: ${error.message}`,
      );
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📋 Obtiene todos los reportes
   * GET /reports?limit=50&skip=0
   */
  @Get()
  async findAll(@Query("limit") limit?: string, @Query("skip") skip?: string) {
    try {
      this.logger.log("📋 Obteniendo todos los reportes...");

      const result = await this.reportsService.findAll(
        parseInt(limit || "50"),
        parseInt(skip || "0"),
      );

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo reportes: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 🚨 Obtiene reportes críticos (triage 4-5)
   * GET /reports/critical
   */
  @Get("critical")
  async getCriticalReports() {
    try {
      this.logger.log("🚨 Obteniendo reportes críticos...");

      const result = await this.reportsService.getCriticalReports();

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Error obteniendo reportes críticos: ${error.message}`,
      );
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📊 Obtiene estadísticas de reportes
   * GET /reports/stats
   */
  @Get("stats")
  async getStatistics() {
    try {
      this.logger.log("📊 Generando estadísticas...");

      const result = await this.reportsService.getStatistics();

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo estadísticas: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📋 Obtiene reportes de un paciente específico
   * GET /reports/patient/:patientId
   */
  @Get("patient/:patientId")
  async findByPatient(@Param("patientId") patientId: string) {
    try {
      this.logger.log(`📋 Obteniendo reportes del paciente: ${patientId}`);

      const result = await this.reportsService.findByPatient(patientId);

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📋 Obtiene reportes de un médico específico
   * GET /reports/doctor/:doctorId
   */
  @Get("doctor/:doctorId")
  async findByDoctor(@Param("doctorId") doctorId: string) {
    try {
      this.logger.log(`📋 Obteniendo reportes del médico: ${doctorId}`);

      const result = await this.reportsService.findByDoctor(doctorId);

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📄 Obtiene un reporte específico por ID
   * GET /reports/:id
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    try {
      this.logger.log(`📄 Obteniendo reporte: ${id}`);

      const result = await this.reportsService.findOne(id);

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * ✏️ Marca un reporte como revisado por médico
   * PATCH /reports/:id/mark-reviewed
   */
  @Patch(":id/mark-reviewed")
  @HttpCode(HttpStatus.OK)
  async markAsReviewed(
    @Param("id") id: string,
    @Body() dto: { medicoRevisorId: string; notes?: string },
  ) {
    try {
      this.logger.log(`✏️ Marcando como revisado: ${id}`);

      const result = await this.reportsService.markAsReviewed(
        id,
        dto.medicoRevisorId,
        dto.notes,
      );

      return {
        success: true,
        ...result,
        message: `✅ Reporte marcado como revisado`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📝 Actualiza un reporte
   * PATCH /reports/:id
   */
  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  async update(
    @Param("id") id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    try {
      this.logger.log(`📝 Actualizando reporte: ${id}`);

      const result = await this.reportsService.update(id, updateReportDto);

      return {
        success: true,
        ...result,
        message: `✅ Reporte actualizado`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 🗑️ Elimina un reporte
   * DELETE /reports/:id
   */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id") id: string) {
    try {
      this.logger.log(`🗑️ Eliminando reporte: ${id}`);

      const result = await this.reportsService.remove(id);

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * Detecta el formato de audio a partir del MIME type
   */
  private getAudioFormatFromMimeType(mimeType: string): string {
    const mimeToFormat: Record<string, string> = {
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
      "audio/webm": "webm",
      "audio/flac": "flac",
    };

    return mimeToFormat[mimeType] || "mp3";
  }
}
