import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { HospitalsService } from "./hospitals.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Controller("hospitals")
export class HospitalsController {
  constructor(
    private readonly service: HospitalsService,
    @InjectModel("Patient") private patientModel: Model<any>,
  ) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/saturation")
  getSaturation(@Param("id") id: string) {
    return this.service.getSaturation(id, this.patientModel);
  }
}
