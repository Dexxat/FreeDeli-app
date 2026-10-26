import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { PedidosApi } from '../api/pedidos.api';
import { RidersApi } from '../api/riders.api';
import { MockPedidosApi } from './mock-pedidos.api';
import { MockRidersApi } from './mock-riders.api';

/** Conecta las APIs a los datos simulados en memoria. Cambiar por el backend real cuando exista. */
export function provideFreeDeliMocks(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: RidersApi, useClass: MockRidersApi },
    { provide: PedidosApi, useClass: MockPedidosApi },
  ]);
}
