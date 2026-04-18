import { Injectable, UnauthorizedException } from "@nestjs/common";
import { DoctorsService } from "../doctor/doctor.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private doctorsService: DoctorsService,
    private jwtService: JwtService,
  ) {}

  // 🟢 SIGNUP
  async signup(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const doctor = await this.doctorsService.create({
      ...data,
      password: hashedPassword,
    });

    return {
      message: "Doctor creado correctamente",
      id: doctor._id,
    };
  }

  // 🔵 LOGIN
  async login(email: string, password: string) {
    const doctor = await this.doctorsService.findByEmail(email);

    if (!doctor) {
      throw new UnauthorizedException("Doctor no encontrado");
    }

    const isValid = await bcrypt.compare(password, doctor.password);

    if (!isValid) {
      throw new UnauthorizedException("Password incorrecta");
    }

    const token = this.jwtService.sign({
      id: doctor._id,
      role: doctor.role,
      hospitalId: doctor.hospitalId,
    });

    return {
      token,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        hospitalId: doctor.hospitalId,
      },
    };
  }
}
