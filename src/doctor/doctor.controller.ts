import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from "@nestjs/common";
import { DoctorsService } from "./doctor.service";

@Controller("doctors")
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  @Get()
  findAll() {
    return this.doctorsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.doctorsService.findById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.doctorsService.update(id, body);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.doctorsService.delete(id);
  }
}
