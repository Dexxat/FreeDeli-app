import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { PedidosApi } from '../api/pedidos.api';
import { RidersApi } from '../api/riders.api';
import { MockPedidosApi } from './mock-pedidos.api';
import { LATENCIA_MOCK, MockRidersApi } from './mock-riders.api';

/** Conecta las APIs a los datos simulados en memoria. Cambiar por el backend real cuando exista. */
export function provideFreeDeliMocks(opciones: { latencia?: number } = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...(opciones.latencia !== undefined ? [{ provide: LATENCIA_MOCK, useValue: opciones.latencia }] : []),
    { provide: RidersApi, useClass: MockRidersApi },
    { provide: PedidosApi, useClass: MockPedidosApi },
  ]);
}
