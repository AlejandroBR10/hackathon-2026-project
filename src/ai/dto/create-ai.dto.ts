import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateAiDto {
  @IsString({ message: "El dictado debe ser un texto válido" })
  @IsNotEmpty({ message: "El dictado médico es requerido" })
  @MinLength(10, { message: "El dictado debe tener al menos 10 caracteres" })
  @MaxLength(5000, { message: "El dictado no puede exceder 5000 caracteres" })
  dictation: string;

  @IsString({ message: "El contexto debe ser un texto válido" })
  @IsOptional()
  @MaxLength(500, { message: "El contexto no puede exceder 500 caracteres" })
  context?: string;

  @IsString({ message: "La especialidad debe ser un texto válido" })
  @IsOptional()
  specialty?: string;

  @IsString({ message: "La unidad hospitalaria debe ser un texto válido" })
  @IsOptional()
  hospitalUnit?: string;

  @IsString({ message: "El ID del paciente debe ser un texto válido" })
  @IsOptional()
  patientId?: string;
}
