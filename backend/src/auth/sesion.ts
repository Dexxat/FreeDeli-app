import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { EstadoCuenta, Rol } from '../generated/prisma/enums.js';

/** Lo que va dentro del token y queda en request.sesion. */
export interface Sesion {
  sub: string;
  rol: Rol;
  estado: EstadoCuenta;
}

export const ROLES = 'roles';
export const PUBLICO = 'publico';
export const PERMITIR_PENDIENTE = 'permitirPendiente';

/** Solo estos roles. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES, roles);
/** Sin sesión. */
export const Publico = () => SetMetadata(PUBLICO, true);
/** Con sesión, aunque la cuenta esté pendiente de aprobación. */
export const PermitirPendiente = () => SetMetadata(PERMITIR_PENDIENTE, true);

export const SesionActual = createParamDecorator((_: unknown, ctx: ExecutionContext): Sesion => ctx.switchToHttp().getRequest().sesion);
