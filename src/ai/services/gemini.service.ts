import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Interfaz para la respuesta estructurada de Gemini
 * Representa el análisis SOAP clínico con triage
 */
export interface ClinicalAnalysis {
  resumen: string;
  soap: {
    subjetivo: string;
    objetivo: string;
    analisis: string;
    plan: string;
  };
  diagnostico_presuntivo: string;
  nivel_triage: number;
  nivel_triage_justificacion: string;
  especialidad: string;
  version_paciente: string; // Texto amigable para el paciente
  hallazgos_criticos?: string[];
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private client: GoogleGenerativeAI;
  private readonly systemInstruction: string;
  private readonly validEspecialidades = [
    "Trauma",
    "Pediatría",
    "Cirugía",
    "Cardiología",
    "Neurología",
    "General",
    "Otro",
  ];

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      "GOOGLE_GENERATIVE_AI_API_KEY",
    );

    if (!apiKey) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY no está configurada en .env",
      );
    }

    this.client = new GoogleGenerativeAI(apiKey);

    // System Instruction para el Hospital Moscati
    this.systemInstruction = `
Eres un Scribe Médico Especializado para el Hospital Moscati de Alta Especialidad.

Tu tarea es procesar dictados médicos crudos de doctores y transformarlos en un análisis clínico estructurado.

ESPECIALIDADES VÁLIDAS (IMPORTANTE - SOLO ESTAS):
- Trauma
- Pediatría
- Cirugía
- Cardiología
- Neurología
- General
- Otro

RESTRICCIONES CRÍTICAS:
1. Debes responder EXCLUSIVAMENTE en JSON válido. Sin texto extra.
2. El JSON debe tener exactamente estas claves: resumen, soap, diagnostico_presuntivo, nivel_triage, nivel_triage_justificacion, especialidad, version_paciente.
3. No incluyas explicaciones fuera del JSON.
4. El nivel_triage debe ser un número de 1-5 (1=No urgente, 5=Emergencia).
5. version_paciente debe ser un texto amable y comprensible para el paciente, en 2-3 oraciones.
6. La especialidad DEBE ser EXACTAMENTE una de las listadas arriba. Si no coincide, usa "Otro".

FORMATO SOAP:
- subjetivo: Lo que el paciente reporta
- objetivo: Hallazgos físicos/pruebas
- analisis: Tu interpretación clínica
- plan: Acciones a tomar

Si el dictado no contiene información médica válida o es ambiguo, igual devuelve el JSON pero con valores por defecto y pon "Información insuficiente" en el resumen.
    `;
  }

  /**
   * Procesa un dictado médico crudo y devuelve análisis clínico estructurado
   */
  async processClinicDictation(
    dictation: string,
    context?: string,
  ): Promise<ClinicalAnalysis> {
    try {
      this.logger.log("🏥 Procesando dictado médico...");

      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: this.systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3, // Bajo para respuestas consistentes
          topK: 40,
          topP: 0.95,
        },
      });

      const prompt = context
        ? `${context}\n\nDictado médico: ${dictation}`
        : `Dictado médico: ${dictation}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Limpieza de posibles bloques Markdown
      const cleanedResponse = this.cleanMarkdownJson(responseText);

      // Parse del JSON
      const analysis: ClinicalAnalysis = JSON.parse(cleanedResponse);

      // Validar y corregir especialidad si no es válida
      analysis.especialidad = this.validateAndFixEspecialidad(
        analysis.especialidad,
      );

      this.logger.log(
        `✅ Análisis completado. Triage: ${analysis.nivel_triage}, Especialidad: ${analysis.especialidad}`,
      );

      return analysis;
    } catch (error) {
      this.logger.error(
        `❌ Error procesando dictado: ${error.message}`,
        error.stack,
      );

      // Fallback si Gemini falla
      return this.getFallbackAnalysis(dictation);
    }
  }

  /**
   * Limpia posibles bloques Markdown en la respuesta JSON
   */
  private cleanMarkdownJson(response: string): string {
    // Elimina bloques ```json ... ```
    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Valida y corrige la especialidad si no es válida en el enum de MongoDB
   * Mapea especialidades incorrectas a las válidas o retorna "Otro"
   */
  private validateAndFixEspecialidad(especialidad: string): string {
    if (!especialidad) {
      return "General";
    }

    // Si es válida, retornarla tal cual
    if (this.validEspecialidades.includes(especialidad)) {
      return especialidad;
    }

    // Si no es válida, intentar mapeo fuzzy o retornar "Otro"
    const especLower = especialidad.toLowerCase().trim();

    // Intentar encontrar una coincidencia parcial
    const mapping: Record<string, string> = {
      emergencia: "Trauma",
      urgencia: "Trauma",
      emergency: "Trauma",
      urgent: "Trauma",
      pediatric: "Pediatría",
      pediátrico: "Pediatría",
      surgery: "Cirugía",
      quirúrgico: "Cirugía",
      surgical: "Cirugía",
      cardiac: "Cardiología",
      cardio: "Cardiología",
      heart: "Cardiología",
      neuro: "Neurología",
      neurologic: "Neurología",
      brain: "Neurología",
    };

    for (const [key, value] of Object.entries(mapping)) {
      if (especLower.includes(key)) {
        this.logger.warn(
          `⚠️ Especialidad "${especialidad}" mapeada a "${value}"`,
        );
        return value;
      }
    }

    this.logger.warn(
      `⚠️ Especialidad "${especialidad}" no reconocida, usando "Otro"`,
    );
    return "Otro";
  }

  /**
   * Análisis por defecto si hay error en Gemini
   */
  private getFallbackAnalysis(dictation: string): ClinicalAnalysis {
    return {
      resumen:
        "Análisis preliminar - Sistema en modo fallback. Se requiere revisión manual.",
      soap: {
        subjetivo: dictation.substring(0, 200),
        objetivo: "Pendiente de evaluación",
        analisis: "Reporte recibido, requiere procesamiento manual",
        plan: "Remitir a equipo médico para análisis completo",
      },
      diagnostico_presuntivo: "Pendiente de evaluación",
      nivel_triage: 3,
      nivel_triage_justificacion:
        "Prioritario moderado - se requiere revisión manual",
      especialidad: "General",
      version_paciente:
        "Su reporte ha sido recibido. Un especialista lo revisará en breve.",
      hallazgos_criticos: [],
    };
  }

  /**
   * Genera un resumen ejecutivo para dashboard
   */
  async generateExecutiveSummary(analysis: ClinicalAnalysis): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const prompt = `
Basándote en este análisis clínico, genera un resumen ejecutivo de 1 párrafo (máximo 100 palabras) para el dashboard del Hospital Moscati:

Diagnóstico: ${analysis.diagnostico_presuntivo}
Triage: ${analysis.nivel_triage}/5
Plan: ${analysis.soap.plan}

Resumen:`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.warn("⚠️ No se pudo generar resumen ejecutivo:", error);
      return analysis.resumen;
    }
  }
}
