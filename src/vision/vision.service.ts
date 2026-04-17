import { Injectable } from '@nestjs/common';
import { CreateVisionDto } from './dto/create-vision.dto';
import { UpdateVisionDto } from './dto/update-vision.dto';

@Injectable()
export class VisionService {
  create(createVisionDto: CreateVisionDto) {
    return 'This action adds a new vision';
  }

  findAll() {
    return `This action returns all vision`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vision`;
  }

  update(id: number, updateVisionDto: UpdateVisionDto) {
    return `This action updates a #${id} vision`;
  }

  remove(id: number) {
    return `This action removes a #${id} vision`;
  }
}
