import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Document } from "mongoose";
import { ObjectId } from "mongodb";

export type DoctorDocument = HydratedDocument<Doctor>;

@Schema({ timestamps: true })
export class Doctor extends Document {
 

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: "doctor" })
  role!: string;

  @Prop()
  hospitalId!: string;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
