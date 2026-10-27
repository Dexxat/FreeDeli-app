import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Parámetros de negocio, configurables por entorno. */
@Injectable()
export class ReglasConfig {
  constructor(private readonly config: ConfigService) {}

  get comisionPorcentaje(): number {
    return Number(this.config.get('COMISION_PORCENTAJE') ?? 10);
  }

  get tarifaEnvio(): { base: number; porKm: number } {
    return { base: Number(this.config.get('TARIFA_BASE') ?? 1000), porKm: Number(this.config.get('TARIFA_POR_KM') ?? 400) };
  }

  get aliasFreeDeli(): string {
    return this.config.get('ALIAS_FREEDELI') ?? 'freedeli.pagos';
  }

  /** true ignora el horario nocturno (00 a 08 hs). Solo para desarrollo y pruebas. */
  get horarioLibre(): boolean {
    return this.config.get('HORARIO_LIBRE') === 'true';
  }

  /** Segundos que tiene un rider para aceptar una oferta. */
  get segundosOferta(): number {
    return Number(this.config.get('SEGUNDOS_OFERTA') ?? 30);
  }
}
