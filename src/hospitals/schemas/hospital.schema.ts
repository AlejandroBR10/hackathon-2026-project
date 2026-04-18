import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type HospitalDocument = Hospital & Document;

@Schema({ timestamps: true })
export class Hospital {
  @Prop({ required: true })
  name!: string;

  @Prop()
  city!: string;

  @Prop()
  state!: string;

  @Prop()
  capacity!: number; // camas totales

  @Prop()
  icuBeds!: number; // camas UCI

  @Prop({ default: true })
  active!: boolean;
}

export const HospitalSchema = SchemaFactory.createForClass(Hospital);
