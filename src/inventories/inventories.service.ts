import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class InventoriesService {
  
  async procesarImagen(file: Express.Multer.File, totalEsperado: number) {
    
    // 1. Mandamos la foto a Python
    const formData = new FormData();
    formData.append('file', file.buffer, { filename: file.originalname });
    
    const respuestaIA = await axios.post('http://localhost:8000/predict', formData, {
        headers: formData.getHeaders(),
    });

    // 2. Usamos la propiedad "conteo_total" que Python ya nos entregaba
    const totalDetectado = respuestaIA.data.conteo_total;

    // 3. Matemáticas de primaria (La Regla de Negocio)
    const diferencia = totalEsperado - totalDetectado;

    let estado = "OK";
    let mensaje = "El inventario cuadra perfectamente.";

    if (diferencia > 0) {
        estado = "PELIGRO";
        mensaje = `¡ALERTA! Faltan ${diferencia} instrumentos en la charola.`;
    } else if (diferencia < 0) {
        estado = "PELIGRO";
        mensaje = `¡ALERTA! Hay ${Math.abs(diferencia)} instrumentos EXTRA en la charola.`;
    }

    // 4. La respuesta limpia para el Frontend
    return {
        estado_operacion: estado,
        mensaje_sistema: mensaje,
        auditoria: {
            esperado: totalEsperado,
            detectado: totalDetectado
        }
    };
  }
}
