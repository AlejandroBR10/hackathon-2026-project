import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class ProcessScribingDto {
  @IsString()
  @IsNotEmpty({ message: 'El dictado médico es requerido' })
  @MinLength(10, { message: 'El dictado debe tener al menos 10 caracteres' })
  @MaxLength(5000, { message: 'El dictado no puede exceder 5000 caracteres' })
  dictation: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID del paciente es requerido' })
  patientId: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID del médico es requerido' })
  doctorId: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  context?: string;

  @IsString()
  @IsOptional()
  hospitalUnit?: string;
}
