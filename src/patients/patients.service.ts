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
    const triage = this.calculateTriage(data);

    return this.patientModel.create({
      ...data,
      triage,
    });
  }

  private calculateTriage(patient: any) {
    let score = 0;

    const v = patient.vitalSigns || {};

    if (patient.age > 60) score += 2;
    if (v.heartRate > 100) score += 2;
    if (v.temperature > 38) score += 2;
    if (v.oxygenSaturation < 92) score += 3;

    let level = "bajo";

    if (score >= 8) level = "critico";
    else if (score >= 6) level = "alto";
    else if (score >= 3) level = "medio";

    return {
      level,
      score,
    };
  }

  findAll() {
    return this.patientModel.find();
  }

  async getByPriority() {
    return this.patientModel.find().sort({ "triage.score": -1 }); // 🔥 mayor prioridad primero
  }

  async getStats() {
    const total = await this.patientModel.countDocuments();

    const uci = await this.patientModel.countDocuments({ status: "uci" });

    const criticos = await this.patientModel.countDocuments({
      "triage.level": "critico",
    });

    const altos = await this.patientModel.countDocuments({
      "triage.level": "alto",
    });

    const medios = await this.patientModel.countDocuments({
      "triage.level": "medio",
    });

    const bajos = await this.patientModel.countDocuments({
      "triage.level": "bajo",
    });

    return {
      total,
      uci,
      criticos,
      altos,
      medios,
      bajos,
    };
  }
  async fixTriage() {
    const patients = await this.patientModel.find();

    for (const p of patients) {
      const triage = this.calculateTriage(p);

      await this.patientModel.findByIdAndUpdate(p._id, { triage });
    }

    return { message: "Triage agregado a todos los pacientes" };
  }
}
