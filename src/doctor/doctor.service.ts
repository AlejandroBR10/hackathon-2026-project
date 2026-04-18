import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Doctor } from "./schemas/doctor.schema";

@Injectable()
export class DoctorsService {
  constructor(@InjectModel(Doctor.name) private doctorModel: Model<Doctor>) {}

  create(data: any) {
    return this.doctorModel.create(data);
  }

  findAll() {
    return this.doctorModel.find();
  }

  findByEmail(email: string) {
    return this.doctorModel.findOne({ email }).exec();
  }

  findById(id: string) {
    return this.doctorModel.findById(id);
  }

  update(id: string, data: any) {
    return this.doctorModel.findByIdAndUpdate(id, data, {
      new: true,
    });
  }

  delete(id: string) {
    return this.doctorModel.findByIdAndDelete(id);
  }
}
