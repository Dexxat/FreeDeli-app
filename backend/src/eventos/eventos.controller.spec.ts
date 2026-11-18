import type { MessageEvent } from '@nestjs/common';
import { NEVER } from 'rxjs';
import type { PrismaService } from '../prisma/prisma.service.js';
import { Rol } from '../generated/prisma/enums.js';
import { EventosController, SEGUNDOS_LATIDO } from './eventos.controller.js';
import type { EventosService } from './eventos.service.js';

describe('EventosController', () => {
  afterEach(() => vi.useRealTimers());

  it('manda una señal de vida aunque no haya eventos, para que la conexión no se corte', () => {
    vi.useFakeTimers();
    const controller = new EventosController({ flujo$: NEVER } as unknown as EventosService, {} as PrismaService);
    const recibidos: MessageEvent[] = [];
    const sub = controller.flujo({ sub: 'dev', rol: Rol.DEV, estado: 'APROBADA' } as never).subscribe((m) => recibidos.push(m));
    vi.advanceTimersByTime(SEGUNDOS_LATIDO * 1000 * 2);
    sub.unsubscribe();
    expect(recibidos.map((m) => m.type)).toEqual(['latido', 'latido']);
  });
});
