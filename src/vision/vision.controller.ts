import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VisionService } from './vision.service';
import { CreateVisionDto } from './dto/create-vision.dto';
import { UpdateVisionDto } from './dto/update-vision.dto';

@Controller('vision')
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

  @Post()
  create(@Body() createVisionDto: CreateVisionDto) {
    return this.visionService.create(createVisionDto);
  }

  @Get()
  findAll() {
    return this.visionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.visionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVisionDto: UpdateVisionDto) {
    return this.visionService.update(+id, updateVisionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.visionService.remove(+id);
  }
}
