import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { GeminiService } from "./services/gemini.service";
import { ElevenlabsService } from "./services/elevenlabs.service";

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, GeminiService, ElevenlabsService],
  exports: [GeminiService, ElevenlabsService, AiService],
})
export class AiModule {}
