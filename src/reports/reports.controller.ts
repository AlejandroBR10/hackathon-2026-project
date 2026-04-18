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
  NotFoundException,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import {
  ProcessAudioWithFeedbackDto,
  SubmitFeedbackResponseDto,
} from "./dto/upload-audio.dto";

@Controller("reports")
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * 🎙️ Endpoint Principal: Procesar audio con análisis completo
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
        `📥 Audio recibido: ${(file.size / 1024).toFixed(2)} KB - Paciente: ${dto.patientId}`,
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
        message: `✅ Audio procesado. ${result.feedback.questions.length} preguntas generadas.`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(
        `Error procesando audio: ${error.message}`,
      );
    }
  }

  /**
   * ⚡ Transcribir solo (sin análisis)
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

      this.logger.log(`📝 Transcribiendo: ${(file.size / 1024).toFixed(2)} KB`);

      const audioFormat = this.getAudioFormatFromMimeType(file.mimetype);

      const result = await this.reportsService.transcribeAudioOnly(
        file.buffer,
        audioFormat,
        dto.context,
      );

      return {
        success: true,
        ...result,
        message: `✅ Transcripción completada`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📝 Procesar dictado directo (texto en lugar de audio)
   * POST /reports/process-dictation-with-feedback
   */
  @Post("process-dictation-with-feedback")
  @HttpCode(HttpStatus.OK)
  async processDictationWithFeedback(@Body() dto: ProcessAudioWithFeedbackDto) {
    try {
      if (!dto.transcription || dto.transcription.trim().length === 0) {
        throw new BadRequestException("Se requiere una transcripción");
      }

      this.logger.log(`📝 Procesando dictado del paciente: ${dto.patientId}`);

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
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 💬 Enviar respuestas de retroalimentación
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

      this.logger.log(`💬 Retroalimentación recibida para: ${reportId}`);

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
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 🏁 Finalizar reporte - Cierra ciclo de feedback
   * POST /reports/:reportId/finalize
   */
  @Post(":reportId/finalize")
  @HttpCode(HttpStatus.OK)
  async finalizeReport(
    @Param("reportId") reportId: string,
    @Body() dto?: { finalNotes?: string },
  ) {
    try {
      this.logger.log(`🏁 Finalizando reporte: ${reportId}`);

      const result = await this.reportsService.finalizeReport(
        reportId,
        dto?.finalNotes,
      );

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
   * 🔊 Descargar audio de pregunta de retroalimentación
   * GET /reports/:reportId/question/:questionId/audio
   */
  @Get(":reportId/question/:questionId/audio")
  @HttpCode(HttpStatus.OK)
  async getQuestionAudio(
    @Param("reportId") reportId: string,
    @Param("questionId") questionId: string,
    @Res() res: any,
  ) {
    try {
      this.logger.log(
        `🔊 Descargando audio de pregunta: ${questionId} del reporte: ${reportId}`,
      );

      // Obtener reporte con metadata
      const report = await this.reportsService.findOne(reportId);

      if (!report) {
        throw new NotFoundException(`Reporte no encontrado: ${reportId}`);
      }

      // Buscar pregunta en metadata
      const question = report.metadata?.feedbackQuestions?.find(
        (q: any) => q.id === questionId,
      );

      if (!question) {
        throw new NotFoundException(`Pregunta no encontrada: ${questionId}`);
      }

      // Buscar audio base64 en feedbackQuestionsWithAudio
      let audioBase64 = null;

      const questionWithAudio =
        report.metadata?.feedbackQuestionsWithAudio?.find(
          (q: any) => q.question?.id === questionId,
        );

      if (questionWithAudio?.audioBase64) {
        audioBase64 = questionWithAudio.audioBase64;
      }

      if (!audioBase64) {
        throw new NotFoundException(
          `Audio no disponible para la pregunta: ${questionId}`,
        );
      }

      // Convertir base64 a Buffer
      const audioBuffer = Buffer.from(audioBase64, "base64");

      // Configurar headers para descarga MP3
      res.setHeader("Content-Type", "audio/mp3");
      res.setHeader("Content-Length", audioBuffer.length);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pregunta-${questionId}.mp3"`,
      );

      this.logger.log(
        `✅ Audio enviado: ${(audioBuffer.length / 1024).toFixed(2)} KB`,
      );

      res.send(audioBuffer);
    } catch (error: any) {
      this.logger.error(`❌ Error descargando audio: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📋 Obtener todos los reportes
   * GET /reports?limit=50&skip=0
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query("limit") limit?: string, @Query("skip") skip?: string) {
    try {
      this.logger.log("📋 Obteniendo reportes...");

      const result = await this.reportsService.findAll(
        parseInt(limit || "50"),
        parseInt(skip || "0"),
      );

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
   * 🚨 Reportes críticos (triage 4-5)
   * GET /reports/critical
   */
  @Get("critical")
  @HttpCode(HttpStatus.OK)
  async getCriticalReports() {
    try {
      this.logger.log("🚨 Reportes críticos...");

      const result = await this.reportsService.getCriticalReports();

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
   * 🏥 Reportes por especialidad
   * GET /reports/specialty/:specialty?limit=50
   */
  @Get("specialty/:specialty")
  @HttpCode(HttpStatus.OK)
  async findBySpecialty(
    @Param("specialty") specialty: string,
    @Query("limit") limit?: string,
  ) {
    try {
      this.logger.log(`🏥 Reportes de especialidad: ${specialty}`);

      const reports = await this.reportsService.findBySpecialty(specialty);

      return {
        success: true,
        ...reports,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error: ${error.message}`);
      throw new InternalServerErrorException(`Error: ${error.message}`);
    }
  }

  /**
   * 📊 Estadísticas generales
   * GET /reports/stats
   */
  @Get("stats")
  @HttpCode(HttpStatus.OK)
  async getStatistics() {
    try {
      this.logger.log("📊 Estadísticas...");

      const result = await this.reportsService.getStatistics();

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
   * 👤 Reportes de un paciente
   * GET /reports/patient/:patientId
   */
  @Get("patient/:patientId")
  @HttpCode(HttpStatus.OK)
  async findByPatient(@Param("patientId") patientId: string) {
    try {
      this.logger.log(`👤 Reportes del paciente: ${patientId}`);

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
   * 👨‍⚕️ Reportes de un médico/profesional
   * GET /reports/doctor/:doctorId
   */
  @Get("doctor/:doctorId")
  @HttpCode(HttpStatus.OK)
  async findByDoctor(@Param("doctorId") doctorId: string) {
    try {
      this.logger.log(`👨‍⚕️ Reportes del profesional: ${doctorId}`);

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
   * 📄 Obtener un reporte por ID
   * GET /reports/:id
   * Incluye categorización calculada dinámicamente
   */
  @Get(":id")
  @HttpCode(HttpStatus.OK)
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
   * ✏️ Actualizar un reporte
   * PATCH /reports/:id
   */
  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  async update(
    @Param("id") id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    try {
      this.logger.log(`✏️ Actualizando: ${id}`);

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
   * 🗑️ Eliminar un reporte
   * DELETE /reports/:id
   */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id") id: string) {
    try {
      this.logger.log(`🗑️ Eliminando: ${id}`);

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
