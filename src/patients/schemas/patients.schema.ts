import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PatientDocument = Patient & Document;

class VitalSigns {
  @Prop()
  heartRate!: number;

  @Prop()
  bloodPressure!: string;

  @Prop()
  temperature!: number;
}

@Schema({ timestamps: true })
export class Patient {

  @Prop({ required: true })
  name!: string;

  @Prop()
  age!: number;

  @Prop()
  gender!: string;

  @Prop()
  diagnosis!: string;

  @Prop()
  hospitalId!: string;

  @Prop({ type: VitalSigns })
  vitalSigns!: VitalSigns;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);