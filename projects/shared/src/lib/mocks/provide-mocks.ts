import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { PedidosApi } from '../api/pedidos.api';
import { RidersApi } from '../api/riders.api';
import { DEMORA_OFERTA_MOCK, MockPedidosApi } from './mock-pedidos.api';
import { LATENCIA_MOCK, MockRidersApi } from './mock-riders.api';

/** Conecta las APIs a los datos simulados en memoria. Cambiar por el backend real cuando exista. */
export function provideFreeDeliMocks(opciones: { latencia?: number; demoraOferta?: number } = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...(opciones.latencia !== undefined ? [{ provide: LATENCIA_MOCK, useValue: opciones.latencia }] : []),
    ...(opciones.demoraOferta !== undefined ? [{ provide: DEMORA_OFERTA_MOCK, useValue: opciones.demoraOferta }] : []),
    { provide: RidersApi, useClass: MockRidersApi },
    { provide: PedidosApi, useClass: MockPedidosApi },
  ]);
}
