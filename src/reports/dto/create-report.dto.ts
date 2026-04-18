import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  MinLength,
  MaxLength,
  IsEnum,
} from "class-validator";

export class CreateReportDto {
  @IsMongoId({ message: "El ID del paciente debe ser un MongoDB ID válido" })
  @IsNotEmpty({ message: "El ID del paciente es requerido" })
  patientId: string;

  @IsMongoId({ message: "El ID del médico debe ser un MongoDB ID válido" })
  @IsNotEmpty({ message: "El ID del médico es requerido" })
  doctorId: string;

  @IsString({ message: "El dictado debe ser un texto válido" })
  @IsNotEmpty({ message: "El dictado médico es requerido" })
  @MinLength(10, { message: "El dictado debe tener al menos 10 caracteres" })
  @MaxLength(5000, { message: "El dictado no puede exceder 5000 caracteres" })
  dictado: string;

  @IsString({ message: "La especialidad debe ser un texto válido" })
  @IsNotEmpty({ message: "La especialidad es requerida" })
  @IsEnum(
    [
      "Trauma",
      "Pediatría",
      "Cirugía",
      "Cardiología",
      "Neurología",
      "General",
      "Otro",
    ],
    { message: "La especialidad debe ser una de las opciones válidas" },
  )
  especialidad: string;

  @IsString({ message: "El contexto debe ser un texto válido" })
  @IsOptional()
  @MaxLength(500, { message: "El contexto no puede exceder 500 caracteres" })
  contexto?: string;

  @IsString({ message: "La unidad hospitalaria debe ser un texto válido" })
  @IsOptional()
  @IsEnum(["Moscati Juriquilla", "Moscati Centro", "Moscati Satélite"], {
    message: "La unidad hospitalaria debe ser una sede válida",
  })
  unidadHospitalaria?: string;
}
