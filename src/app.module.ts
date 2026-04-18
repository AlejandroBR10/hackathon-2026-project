import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PatientsModule } from "./patients/patients.module";
import { ReportsModule } from "./reports/reports.module";
import { VisionModule } from "./vision/vision.module";
import { AiModule } from "./ai/ai.module";
import { DatabaseModule } from "./database/database.module";
import { HospitalsModule } from './hospitals/hospitals.module';
import { InventoriesModule } from './inventories/inventories.module';
import { DoctorsModule } from './doctor/doctor.module';
import { AuthModule } from './auth/auth.module';

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
    HospitalsModule,
    InventoriesModule,
    DoctorsModule,
    AuthModule,
  ],
})
export class AppModule {}
