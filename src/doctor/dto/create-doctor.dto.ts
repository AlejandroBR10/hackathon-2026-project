export class CreateDoctorDto {
  name!: string;
  email!: string;
  password!: string;
  role!: string;
  hospitalId?: string;
}
