import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { AdminApi } from '../api/admin.api';
import { Gps } from '../api/gps';
import { KioscosApi } from '../api/kioscos.api';
import { PedidosApi } from '../api/pedidos.api';
import { RidersApi } from '../api/riders.api';
import { UsuariosApi } from '../api/usuarios.api';
import { MockAdminApi } from './mock-admin.api';
import { MockGps } from './mock-gps';
import { MockKioscosApi } from './mock-kioscos.api';
import { DEMORA_OFERTA_MOCK, MockPedidosApi } from './mock-pedidos.api';
import { LATENCIA_MOCK, MockRidersApi } from './mock-riders.api';
import { ACTORES_SIMULADOS, ActoresSimulados, DEMORAS_SIMULACION, DemorasSimulacion, MockSimulador } from './mock-simulador';
import { MockUsuariosApi } from './mock-usuarios.api';
import { HORARIO_LIBRE } from '../config/freedeli.config';

export interface OpcionesMocks {
  latencia?: number;
  demoraOferta?: number;
  /** Partes que simula el mock. Por defecto, ninguna. */
  simular?: Partial<ActoresSimulados>;
  demoras?: Partial<DemorasSimulacion>;
  /** true para poder hacer pedidos fuera del horario nocturno (desarrollo y pruebas). */
  horarioLibre?: boolean;
}

/** Conecta las APIs a los datos simulados en memoria. Cambiar por el backend real cuando exista. */
export function provideFreeDeliMocks(opciones: OpcionesMocks = {}): EnvironmentProviders {
  const actores: ActoresSimulados = { cliente: false, kiosco: false, rider: false, pedidosNuevos: false, ...opciones.simular };
  const algunActor = Object.values(actores).some(Boolean);
  return makeEnvironmentProviders([
    ...(opciones.latencia !== undefined ? [{ provide: LATENCIA_MOCK, useValue: opciones.latencia }] : []),
    ...(opciones.demoraOferta !== undefined ? [{ provide: DEMORA_OFERTA_MOCK, useValue: opciones.demoraOferta }] : []),
    { provide: ACTORES_SIMULADOS, useValue: actores },
    ...(opciones.horarioLibre !== undefined ? [{ provide: HORARIO_LIBRE, useValue: opciones.horarioLibre }] : []),
    ...(opciones.demoras ? [{ provide: DEMORAS_SIMULACION, useValue: { paso: 7_000, pedidoNuevo: 45_000, ...opciones.demoras } }] : []),
    { provide: RidersApi, useClass: MockRidersApi },
    { provide: PedidosApi, useClass: MockPedidosApi },
    { provide: UsuariosApi, useClass: MockUsuariosApi },
    { provide: KioscosApi, useClass: MockKioscosApi },
    { provide: AdminApi, useClass: MockAdminApi },
    { provide: Gps, useClass: MockGps },
    MockSimulador,
    ...(algunActor ? [provideEnvironmentInitializer(() => inject(MockSimulador))] : []),
  ]);
}
