import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PatientsModule } from "./patients/patients.module";
import { ReportsModule } from "./reports/reports.module";
import { VisionModule } from "./vision/vision.module";
import { AiModule } from "./ai/ai.module";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,

    // AGREGAR LOS MODULOS NECESARIOS
    PatientsModule,
    ReportsModule,
    VisionModule,
    AiModule,
  ],
})
export class AppModule {}
