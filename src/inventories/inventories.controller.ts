import { Controller, Post, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InventoriesService } from './inventories.service';

@Controller('almacen')
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @Post('contar-quirurgico')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    // Solo pedimos el total general que manda el doctor/enfermera
    @Body('total_esperado') totalEsperado: string, 
  ) {
    const esperado = parseInt(totalEsperado, 10) || 0;
    return this.inventoriesService.procesarImagen(file, esperado);
  }
}
