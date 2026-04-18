import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Patient, PatientSchema } from './schemas/patients.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
    ]),
  ],
  controllers: [PatientsController], // 👈 clave
  providers: [PatientsService],
})
export class PatientsModule {}