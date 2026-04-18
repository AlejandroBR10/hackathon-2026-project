import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";

// patients.controller.ts

@Controller("patients")
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
  @Get("priority")
  getByPriority() {
    return this.service.getByPriority();
  }
  @Get("stats")
  getStats() {
    return this.service.getStats();
  }
  @Post("fix-triage")
  fix() {
    return this.service.fixTriage();
  }

@Patch(':id')
update(
  @Param('id') id: string,
  @Body() body: any,
) {
  return this.service.update(id, body);
}

@Delete(':id')
remove(@Param('id') id: string) {
  return this.service.remove(id);
}

@Patch(':id/vitals')
updateVitals(
  @Param('id') id: string,
  @Body() vitalSigns: any,
) {
  return this.service.updateVitals(id, vitalSigns);
}

}
