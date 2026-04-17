import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PatientsModule } from './patients/patients.module';
import { ReportsModule } from './reports/reports.module';
import { VisionModule } from './vision/vision.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [PatientsModule, ReportsModule, VisionModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
