import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PatientsModule } from "./patients/patients.module";
import { ReportsModule } from "./reports/reports.module";
import { VisionModule } from "./vision/vision.module";
import { AiModule } from "./ai/ai.module";
import { DatabaseModule } from "./database/database.module";
<<<<<<< HEAD
import { HospitalsModule } from './hospitals/hospitals.module';
=======
import { InventoriesModule } from './inventories/inventories.module';
>>>>>>> 574b4d895ea3e869f0ecac55fada4ac0d33dbcf2

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
<<<<<<< HEAD
    HospitalsModule,
=======
    InventoriesModule,
>>>>>>> 574b4d895ea3e869f0ecac55fada4ac0d33dbcf2
  ],
})
export class AppModule {}
