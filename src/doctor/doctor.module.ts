import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Doctor, DoctorSchema } from "./schemas/doctor.schema";
import { DoctorsService } from "./doctor.service";
import { DoctorsController } from "./doctor.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
  ],
  providers: [DoctorsService],
  controllers: [DoctorsController],
  exports: [DoctorsService],
})
export class DoctorsModule {}
