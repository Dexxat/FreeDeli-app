import { InjectionToken } from '@angular/core';

export interface FreeDeliConfig {
  /** WhatsApp de la empresa, con código de país y sin "+" ni espacios. */
  whatsapp: string;
  /** Porcentaje del subtotal de productos que cobra FreeDeli. La comisión nunca baja de COMISION_MINIMA. */
  comisionPorcentaje: number;
  /** Lo que cobra el rider según el anillo de distancia (ver ANILLOS_KM). */
  tarifaEnvio: TarifaEnvio;
  /** Alias de FreeDeli al que los kioscos transfieren para cargar saldo. */
  aliasFreeDeli: string;
}

/** Monto fijo por anillo: menos de 1,5 km, de 1,5 a 3 km, y más de 3 km. */
export interface TarifaEnvio {
  cerca: number;
  media: number;
  lejos: number;
}

/** Valores provisorios hasta definir la tarifa real. */
export const TARIFA_ENVIO_PROVISORIA: TarifaEnvio = { cerca: 3000, media: 4000, lejos: 5000 };

/** Valores por defecto. Reemplazar el WhatsApp por el real con provideFreeDeliConfig(). */
export const FREEDELI_CONFIG = new InjectionToken<FreeDeliConfig>('FREEDELI_CONFIG', {
  factory: () => ({ whatsapp: '5491100000000', comisionPorcentaje: 10, tarifaEnvio: TARIFA_ENVIO_PROVISORIA, aliasFreeDeli: 'freedeli.pagos' }),
});

export function provideFreeDeliConfig(config: FreeDeliConfig) {
  return { provide: FREEDELI_CONFIG, useValue: config };
}

/**
 * true para ignorar el horario nocturno (00 a 08 hs): solo para desarrollo y pruebas.
 * En producción queda en false.
 */
export const HORARIO_LIBRE = new InjectionToken<boolean>('HORARIO_LIBRE', { factory: () => false });

/** Link que abre el chat con FreeDeli, opcionalmente con un mensaje ya escrito. */
export function linkWhatsApp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Link de Google Maps con indicaciones hasta una dirección. */
export function linkComoLlegar(direccion: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}&travelmode=driving`;
}
