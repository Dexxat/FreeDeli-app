import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Parámetros de negocio, configurables por entorno. */
@Injectable()
export class ReglasConfig {
  constructor(private readonly config: ConfigService) {}

  get comisionPorcentaje(): number {
    return Number(this.config.get('COMISION_PORCENTAJE') ?? 10);
  }

  /** Lo que cobra el rider por anillo: menos de 1,5 km, de 1,5 a 3 km, y más de 3 km. */
  get tarifaEnvio(): { cerca: number; media: number; lejos: number } {
    return {
      cerca: Number(this.config.get('TARIFA_CERCA') ?? 3000),
      media: Number(this.config.get('TARIFA_MEDIA') ?? 4000),
      lejos: Number(this.config.get('TARIFA_LEJOS') ?? 5000),
    };
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
