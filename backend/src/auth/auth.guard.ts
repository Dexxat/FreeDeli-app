import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Rol } from '../generated/prisma/enums.js';
import { PERMITIR_PENDIENTE, PUBLICO, ROLES, type Sesion } from './sesion.js';

/**
 * Guard global: exige token salvo en rutas @Publico(), cuenta aprobada salvo @PermitirPendiente(),
 * y el rol pedido por @Roles().
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO, objetivos)) return true;

    const req = ctx.switchToHttp().getRequest();
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Iniciá sesión.');
    let sesion: Sesion;
    try {
      sesion = await this.jwt.verifyAsync<Sesion>(token);
    } catch {
      throw new UnauthorizedException('La sesión venció. Volvé a iniciar sesión.');
    }
    req.sesion = sesion;

    const permitirPendiente = this.reflector.getAllAndOverride<boolean>(PERMITIR_PENDIENTE, objetivos);
    if (sesion.estado !== 'APROBADA' && !permitirPendiente) {
      throw new ForbiddenException(sesion.estado === 'PENDIENTE' ? 'Tu cuenta está esperando la aprobación de FreeDeli.' : 'Tu cuenta no fue aprobada.');
    }
    const roles = this.reflector.getAllAndOverride<Rol[]>(ROLES, objetivos);
    if (roles?.length && !roles.includes(sesion.rol)) throw new ForbiddenException('No tenés acceso a esta sección.');
    return true;
  }
}
