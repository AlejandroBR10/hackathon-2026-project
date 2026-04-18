// patients.service.ts

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Patient, PatientDocument } from "./schemas/patients.schema";

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name)
    private patientModel: Model<PatientDocument>,
  ) {}

  create(data: any) {
    return this.patientModel.create(data);
  }

  findAll() {
    return this.patientModel.find();
  }
}