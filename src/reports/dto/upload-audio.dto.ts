import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  MaxLength,
  IsEnum,
  MinLength,
} from "class-validator";

export class UploadAudioDto {
  @IsString()
  @IsNotEmpty({ message: "El ID del paciente es requerido" })
  @IsMongoId({ message: "El ID del paciente debe ser un MongoDB ID válido" })
  patientId: string;

  @IsString()
  @IsNotEmpty({ message: "El ID del médico es requerido" })
  @IsMongoId({ message: "El ID del médico debe ser un MongoDB ID válido" })
  doctorId: string;

  @IsString()
  @IsOptional()
  @IsEnum([
    "Trauma",
    "Pediatría",
    "Cirugía",
    "Cardiología",
    "Neurología",
    "General",
    "Otro",
  ])
  specialty?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, {
    message: "El contexto no puede exceder 500 caracteres",
  })
  context?: string;

  @IsString()
  @IsOptional()
  @IsEnum(["Moscati Juriquilla", "Moscati Centro", "Moscati Satélite"])
  hospitalUnit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  audioFileName?: string;
}

export class ProcessAudioDto {
  @IsString()
  @IsNotEmpty({ message: "La URL del audio es requerida" })
  audioUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  context?: string;

  @IsString()
  @IsOptional()
  @IsEnum(["mp3", "wav", "ogg", "m4a", "flac", "webm"])
  audioFormat?: string;

  @IsString()
  @IsOptional()
  specialty?: string;
}

export class ProcessAudioWithFeedbackDto {
  @IsString()
  @IsNotEmpty({ message: "El ID del paciente es requerido" })
  @IsMongoId()
  patientId: string;

  @IsString()
  @IsNotEmpty({ message: "El ID del médico es requerido" })
  @IsMongoId()
  doctorId: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(5000)
  transcription?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  context?: string;

  @IsString()
  @IsOptional()
  @IsEnum([
    "Trauma",
    "Pediatría",
    "Cirugía",
    "Cardiología",
    "Neurología",
    "General",
    "Otro",
  ])
  specialty?: string;

  @IsString()
  @IsOptional()
  @IsEnum(["Moscati Juriquilla", "Moscati Centro", "Moscati Satélite"])
  hospitalUnit?: string;

  @IsString()
  @IsOptional()
  audioUrl?: string;

  generateFeedback?: boolean;
}

export class SubmitFeedbackResponseDto {
  @IsString()
  @IsNotEmpty({ message: "El ID del reporte es requerido" })
  reportId: string;

  @IsNotEmpty({ message: "Las respuestas son requeridas" })
  responses: Array<{
    questionId: string;
    answer: string;
  }>;
}
