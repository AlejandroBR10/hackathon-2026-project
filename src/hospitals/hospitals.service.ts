import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hospital } from './schemas/hospital.schema';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectModel(Hospital.name)
    private hospitalModel: Model<Hospital>,
  ) {}

  // Crear hospital
  create(data: any) {
    return this.hospitalModel.create(data);
  }

  // Obtener todos
  findAll() {
    return this.hospitalModel.find();
  }

  // Obtener uno
  findOne(id: string) {
    return this.hospitalModel.findById(id);
  }

  // 🔥 Saturación hospitalaria (clave para hackathon)
  async getSaturation(id: string, patientModel: Model<any>) {
    const hospital = await this.hospitalModel.findById(id);

    const totalPatients = await patientModel.countDocuments({
      hospitalId: id,
    });

    const uciPatients = await patientModel.countDocuments({
      hospitalId: id,
      status: 'uci',
    });

    return {
      hospital: hospital?.name,
      capacity: hospital?.capacity,
      icuBeds: hospital?.icuBeds,
      totalPatients,
      uciPatients,
      occupancy: (totalPatients / (hospital?.capacity || 1)) * 100,
      icuOccupancy: (uciPatients / (hospital?.icuBeds || 1)) * 100,
    };
  }
}