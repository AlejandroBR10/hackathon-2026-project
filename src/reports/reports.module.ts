import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { AudioService } from "./services/audio.service";
import { FeedbackService } from "./services/feedback.service";
import {
  ClinicalReport,
  ClinicalReportSchema,
} from "./schemas/clinical-report.schema";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [
    ConfigModule,
    AiModule,
    MongooseModule.forFeature([
      {
        name: ClinicalReport.name,
        schema: ClinicalReportSchema,
      },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, AudioService, FeedbackService],
  exports: [ReportsService, AudioService, FeedbackService],
})
export class ReportsModule {}
