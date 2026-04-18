import { PartialType } from "@nestjs/mapped-types";
import { CreateReportDto } from "./create-report.dto";
import { IsOptional, IsString, IsEnum } from "class-validator";

export class UpdateReportDto extends PartialType(CreateReportDto) {
  @IsString()
  @IsOptional()
  notas?: string;

  @IsString()
  @IsOptional()
  @IsEnum(["pendiente", "procesado", "error", "enviado_paciente"])
  estado?: string;

  @IsString()
  @IsOptional()
  audioUrl?: string;
}
