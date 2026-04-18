import { Injectable, Logger } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConfigService } from "@nestjs/config";
import { ClinicalAnalysis } from "../../ai/services/gemini.service";
import { ElevenlabsService } from "../../ai/services/elevenlabs.service";

/**
 * Pregunta de retroalimentación clínica
 */
export interface FeedbackQuestion {
  id: string;
  question: string;
  category: "clarification" | "confirmation" | "followup" | "safety";
  importance: "high" | "medium" | "low";
  expectedAnswerType: "yes_no" | "numeric" | "text" | "multiple_choice";
  options?: string[];
  context: string;
}

/**
 * Respuesta a una pregunta de retroalimentación
 */
export interface FeedbackResponse {
  questionId: string;
  answer: string;
  confidence?: number;
  timestamp: Date;
}

/**
 * Servicio de retroalimentación clínica
 * Genera preguntas inteligentes basadas en análisis de Gemini
 * Sintetiza las preguntas con ElevenLabs
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private client: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private elevenLabsService: ElevenlabsService,
  ) {
    const apiKey = this.configService.get<string>(
      "GOOGLE_GENERATIVE_AI_API_KEY",
    );

    if (!apiKey) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY no está configurada en .env",
      );
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Genera preguntas de retroalimentación basadas en el análisis clínico
   * @param analysis Análisis clínico de Gemini
   * @param patientContext Contexto del paciente
   * @returns Array de preguntas de retroalimentación
   */
  async generateFeedbackQuestions(
    analysis: ClinicalAnalysis,
    patientContext?: string,
  ): Promise<FeedbackQuestion[]> {
    try {
      this.logger.log("🤔 Generando preguntas de retroalimentación clínica...");

      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.5,
        },
      });

      const prompt = `
Eres un asistente clínico del Hospital Moscati especializado en validación de reportes médicos.

Basándote en el siguiente análisis clínico, GENERA 3-4 preguntas de retroalimentación inteligentes.

ANÁLISIS CLÍNICO:
- Resumen: ${analysis.resumen}
- Diagnóstico: ${analysis.diagnostico_presuntivo}
- Triage: ${analysis.nivel_triage}/5
- Especialidad: ${analysis.especialidad}
- Plan: ${analysis.soap.plan}

${patientContext ? `CONTEXTO DEL PACIENTE: ${patientContext}` : ""}

REQUERIMIENTOS:
- Máximo 15 palabras por pregunta
- Responde EXCLUSIVAMENTE en JSON válido
- Formato:
{
  "questions": [
    {
      "id": "q1",
      "question": "¿texto?",
      "category": "clarification",
      "importance": "high",
      "expectedAnswerType": "yes_no",
      "context": "por qué se pregunta"
    }
  ]
}
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanedResponse);
      const questions: FeedbackQuestion[] = parsed.questions.map(
        (q: any, idx: number) => ({
          ...q,
          id: q.id || `q${idx + 1}`,
        }),
      );

      this.logger.log(
        `✅ Generadas ${questions.length} preguntas de retroalimentación`,
      );

      return questions;
    } catch (error) {
      this.logger.error(
        `❌ Error generando preguntas: ${error.message}`,
        error.stack,
      );
      return this.getDefaultFeedbackQuestions(analysis);
    }
  }

  /**
   * Sintetiza una pregunta en audio
   * @param question Pregunta a sintetizar
   * @returns Buffer de audio MP3
   */
  async synthesizeFeedbackQuestion(
    question: FeedbackQuestion,
  ): Promise<Buffer> {
    try {
      this.logger.log(`🎙️ Sintetizando pregunta: "${question.question}"`);

      const friendlyText = this.makeFriendlyQuestion(question);
      const audioBuffer =
        await this.elevenLabsService.synthesizeVoice(friendlyText);

      this.logger.log(`✅ Pregunta sintetizada (${audioBuffer.length} bytes)`);
      return audioBuffer;
    } catch (error) {
      this.logger.error(
        `❌ Error sintetizando pregunta: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Sintetiza múltiples preguntas
   * @param questions Array de preguntas
   * @returns Array con {question, audioBase64}
   */
  async synthesizeMultipleFeedbackQuestions(
    questions: FeedbackQuestion[],
  ): Promise<Array<{ question: FeedbackQuestion; audioBase64: string }>> {
    try {
      this.logger.log(`🎙️ Sintetizando ${questions.length} preguntas...`);

      const results: Array<{
        question: FeedbackQuestion;
        audioBase64: string;
      }> = [];

      for (const question of questions) {
        try {
          const audioBuffer = await this.synthesizeFeedbackQuestion(question);
          const audioBase64 = audioBuffer.toString("base64");

          results.push({
            question,
            audioBase64,
          });
        } catch (error) {
          this.logger.warn(`⚠️ No se pudo sintetizar pregunta ${question.id}`);
        }
      }

      this.logger.log(`✅ Sintetizadas ${results.length} preguntas`);
      return results;
    } catch (error) {
      this.logger.error(`❌ Error sintetizando preguntas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa respuestas de retroalimentación
   * @param questions Preguntas originales
   * @param responses Respuestas del usuario
   * @returns Resumen de validación
   */
  async processFeedbackResponses(
    questions: FeedbackQuestion[],
    responses: FeedbackResponse[],
  ): Promise<any> {
    try {
      this.logger.log("📊 Procesando respuestas de retroalimentación...");

      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const questionAnswerPairs = questions
        .map((q) => {
          const response = responses.find((r) => r.questionId === q.id);
          return `P: ${q.question}\nR: ${response?.answer || "No respondida"}`;
        })
        .join("\n\n");

      const prompt = `
Analiza estas respuestas clínicas:

${questionAnswerPairs}

Genera JSON con:
- validityScore (0-100)
- criticalIssues (array)
- recommendations (array)
- summaryText (string)
- requiresImmediateAction (boolean)

Solo JSON válido.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const summary = JSON.parse(cleanedResponse);

      this.logger.log(`✅ Respuestas procesadas`);
      return summary;
    } catch (error) {
      this.logger.error(`❌ Error procesando respuestas: ${error.message}`);

      return {
        validityScore: 0,
        criticalIssues: ["Error procesando respuestas"],
        recommendations: [],
        summaryText: "Error al procesar retroalimentación",
        requiresImmediateAction: false,
      };
    }
  }

  /**
   * Convierte pregunta a versión amigable para síntesis
   */
  private makeFriendlyQuestion(question: FeedbackQuestion): string {
    const prefix =
      question.importance === "high"
        ? "Es importante que respondas: "
        : "Una pregunta: ";

    let text = prefix + question.question;

    if (question.expectedAnswerType === "yes_no") {
      text += " ¿Sí o no?";
    } else if (
      question.expectedAnswerType === "multiple_choice" &&
      question.options
    ) {
      text += ` Las opciones son: ${question.options.join(", ")}`;
    }

    return text;
  }

  /**
   * Preguntas por defecto
   */
  private getDefaultFeedbackQuestions(
    analysis: ClinicalAnalysis,
  ): FeedbackQuestion[] {
    return [
      {
        id: "q1",
        question: `¿Confirmas que el triage nivel ${analysis.nivel_triage} es apropiado?`,
        category: "confirmation",
        importance: "high",
        expectedAnswerType: "yes_no",
        context: "Validación del nivel de urgencia",
      },
      {
        id: "q2",
        question: `¿Necesita alguna prueba adicional además de lo propuesto?`,
        category: "followup",
        importance: "medium",
        expectedAnswerType: "yes_no",
        context: "Completitud del plan",
      },
      {
        id: "q3",
        question: `En escala 1-10, ¿qué tan seguro está del diagnóstico?`,
        category: "clarification",
        importance: "medium",
        expectedAnswerType: "numeric",
        context: "Confianza en el diagnóstico",
      },
    ];
  }
}
