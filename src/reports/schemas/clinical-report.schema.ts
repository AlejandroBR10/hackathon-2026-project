import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * Sub-schema para el análisis SOAP (Subjetivo, Objetivo, Análisis, Plan)
 */
@Schema({ _id: false })
export class SoapAnalysis {
  @Prop({ type: String, required: true })
  subjetivo: string;

  @Prop({ type: String, required: true })
  objetivo: string;

  @Prop({ type: String, required: true })
  analisis: string;

  @Prop({ type: String, required: true })
  plan: string;
}

const SoapAnalysisSchema = SchemaFactory.createForClass(SoapAnalysis);

/**
 * Sub-schema para información de triage
 */
@Schema({ _id: false })
export class TriageInfo {
  @Prop({ type: Number, min: 1, max: 5, required: true })
  nivel: number;

  @Prop({ type: String, required: true })
  justificacion: string;

  @Prop({ type: Date, default: Date.now })
  evaluadoEn: Date;
}

const TriageInfoSchema = SchemaFactory.createForClass(TriageInfo);

/**
 * Esquema principal del Reporte Clínico
 * Almacena el análisis médico completo, incluyendo SOAP, triage y audio
 */
@Schema({ timestamps: true, collection: "clinical_reports" })
export class ClinicalReport extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      "Trauma",
      "Pediatría",
      "Cirugía",
      "Cardiología",
      "Neurología",
      "General",
      "Otro",
    ],
    required: true,
  })
  especialidad: string;

  @Prop({ type: String, required: true })
  resumen: string;

  @Prop({ type: String, required: true })
  diagnostico_presuntivo: string;

  @Prop({ type: SoapAnalysisSchema, required: true })
  soap: SoapAnalysis;

  @Prop({ type: TriageInfoSchema, required: true })
  triage: TriageInfo;

  @Prop({ type: String, required: true })
  version_paciente: string;

  @Prop({ type: [String], default: [] })
  hallazgos_criticos: string[];

  @Prop({ type: String, optional: true })
  audioUrl?: string;

  @Prop({ type: Buffer, optional: true })
  audioBuffer?: Buffer;

  @Prop({ type: String, optional: true })
  dictadoOriginal?: string;

  @Prop({ type: Number, default: 0 })
  horasProcesamiento: number;

  @Prop({
    type: String,
    enum: ["pendiente", "procesado", "error", "enviado_paciente"],
    default: "procesado",
  })
  estado: string;

  @Prop({ type: String, optional: true })
  notas: string;

  @Prop({ type: Date, default: Date.now, index: true })
  procesadoEn: Date;

  @Prop({ type: Boolean, default: false })
  revisadoPorMedico: boolean;

  @Prop({ type: Date, optional: true })
  fechaRevisionMedico?: Date;

  @Prop({ type: Types.ObjectId, optional: true })
  medicoRevisor?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["Moscati Juriquilla", "Moscati Centro", "Moscati Satélite"],
    default: "Moscati Centro",
  })
  unidadHospitalaria: string;

  @Prop({ type: Number, default: 1 })
  versionReporte: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const ClinicalReportSchema =
  SchemaFactory.createForClass(ClinicalReport);

// Type export for use in services
export type ClinicalReportDocument = ClinicalReport & Document;

// Índices para optimización de queries
ClinicalReportSchema.index({ patientId: 1, procesadoEn: -1 });
ClinicalReportSchema.index({ doctorId: 1, procesadoEn: -1 });
ClinicalReportSchema.index({ estado: 1, procesadoEn: -1 });
ClinicalReportSchema.index({ "triage.nivel": 1, procesadoEn: -1 });
ClinicalReportSchema.index({ especialidad: 1, procesadoEn: -1 });
ClinicalReportSchema.index({ procesadoEn: -1 });
