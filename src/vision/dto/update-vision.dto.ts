import { PartialType } from '@nestjs/mapped-types';
import { CreateVisionDto } from './create-vision.dto';

export class UpdateVisionDto extends PartialType(CreateVisionDto) {}
