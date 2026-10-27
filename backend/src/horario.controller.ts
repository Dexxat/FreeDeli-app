import { Controller, Get } from '@nestjs/common';
import { Publico } from './auth/sesion.js';
import { ReglasConfig } from './comun/reglas.config.js';
import { HORARIO_SERVICIO, servicioAbierto } from './dominio.js';

/** Horario en que se toman pedidos. Las apps lo consultan para mostrar si FreeDeli está abierto. */
@Controller('horario')
export class HorarioController {
  constructor(private readonly reglas: ReglasConfig) {}

  @Publico()
  @Get()
  horario() {
    const libre = this.reglas.horarioLibre;
    return { ...HORARIO_SERVICIO, libre, abierto: libre || servicioAbierto(new Date()) };
  }
}
