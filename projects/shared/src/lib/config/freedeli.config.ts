import { InjectionToken } from '@angular/core';

export interface FreeDeliConfig {
  /** WhatsApp de la empresa, con código de país y sin "+" ni espacios. */
  whatsapp: string;
  /** Porcentaje del subtotal de productos que cobra FreeDeli. La comisión nunca baja de COMISION_MINIMA. */
  comisionPorcentaje: number;
  /** Costo de envío = base + porKm × distancia, redondeado a $100 para arriba. */
  tarifaEnvio: TarifaEnvio;
  /** Alias de FreeDeli al que los kioscos transfieren para cargar saldo. */
  aliasFreeDeli: string;
}

export interface TarifaEnvio {
  base: number;
  porKm: number;
}

/** Valores provisorios hasta definir la tarifa real. */
export const TARIFA_ENVIO_PROVISORIA: TarifaEnvio = { base: 1000, porKm: 400 };

/** Valores por defecto. Reemplazar el WhatsApp por el real con provideFreeDeliConfig(). */
export const FREEDELI_CONFIG = new InjectionToken<FreeDeliConfig>('FREEDELI_CONFIG', {
  factory: () => ({ whatsapp: '5491100000000', comisionPorcentaje: 10, tarifaEnvio: TARIFA_ENVIO_PROVISORIA, aliasFreeDeli: 'freedeli.pagos' }),
});

export function provideFreeDeliConfig(config: FreeDeliConfig) {
  return { provide: FREEDELI_CONFIG, useValue: config };
}

/** Link que abre el chat con FreeDeli, opcionalmente con un mensaje ya escrito. */
export function linkWhatsApp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Link de Google Maps con indicaciones hasta una dirección. */
export function linkComoLlegar(direccion: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}&travelmode=driving`;
}
