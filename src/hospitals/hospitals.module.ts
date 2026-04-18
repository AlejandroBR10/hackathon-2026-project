import { Module } from "@nestjs/common";
import { HospitalsService } from "./hospitals.service";
import { HospitalsController } from "./hospitals.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Hospital, HospitalSchema } from "./schemas/hospital.schema";
import { Patient, PatientSchema } from "src/patients/schemas/patients.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hospital.name, schema: HospitalSchema }, 
      { name: Patient.name, schema: PatientSchema }, // 🔥 CLAVE
    ]),
  ],
  controllers: [HospitalsController],
  providers: [HospitalsService],
})
export class HospitalsModule {}
