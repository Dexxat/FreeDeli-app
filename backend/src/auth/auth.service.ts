import { BadRequestException, ConflictException, Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { geolocalizar, zonaDb } from '../comun/zonas.js';
import { normalizarDni, normalizarPatente } from '../dominio.js';
import { EstadoCuenta, Rol } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashearClave, verificarClave } from './clave.js';
import type { RegistroKioscoDto, RegistroRiderDto, RegistroUsuarioDto } from './dto.js';
import type { Sesion } from './sesion.js';
import { EventosService } from '../eventos/eventos.service.js';
import { documentoParaGuardar } from '../rider/documentos.service.js';
import { CorreoService } from '../avisos/correo.service.js';

/** Lo que dura el link para elegir una contraseña nueva. */
export const MINUTOS_RECUPERACION = 30;
const LINK_VENCIDO = 'El link venció o ya se usó. Pedí uno nuevo.';

/** App donde cada rol elige la contraseña nueva. Dev no recupera por mail: su clave se maneja desde el servidor. */
const APP_DEL_ROL: Partial<Record<Rol, { variable: string; local: string }>> = {
  USUARIO: { variable: 'URL_APP_USUARIOS', local: 'http://localhost:4301' },
  KIOSCO: { variable: 'URL_APP_KIOSCOS', local: 'http://localhost:4303' },
  RIDER: { variable: 'URL_APP_RIDERS', local: 'http://localhost:4300' },
};

export interface RespuestaSesion {
  token: string;
  cuenta: { id: string; email: string; rol: Rol; estado: EstadoCuenta };
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly eventos: EventosService,
    private readonly correo: CorreoService,
  ) {}

  /** Crea la cuenta del dueño (única instancia de FreeDeli Dev) si no existe. */
  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('DEV_EMAIL');
    const clave = this.config.get<string>('DEV_CLAVE');
    if (!email || !clave) return;
    if (await this.db.cuenta.findFirst({ where: { rol: Rol.DEV } })) return;
    try {
      await this.db.cuenta.create({ data: { email: email.toLowerCase(), clave: await hashearClave(clave), rol: Rol.DEV, estado: EstadoCuenta.APROBADA } });
      this.log.log(`Cuenta Dev creada: ${email}`);
    } catch (e) {
      // Otra instancia la creó al mismo tiempo (email único).
      if ((e as { code?: string }).code !== 'P2002') throw e;
    }
  }

  private async sesion(cuenta: { id: string; email: string; rol: Rol; estado: EstadoCuenta }): Promise<RespuestaSesion> {
    const payload: Sesion = { sub: cuenta.id, rol: cuenta.rol, estado: cuenta.estado };
    return { token: await this.jwt.signAsync(payload), cuenta: { id: cuenta.id, email: cuenta.email, rol: cuenta.rol, estado: cuenta.estado } };
  }

  private async emailLibre(email: string): Promise<void> {
    if (await this.db.cuenta.findUnique({ where: { email } })) throw new ConflictException('Ya hay una cuenta con ese email.');
  }

  async registrarUsuario(dto: RegistroUsuarioDto): Promise<RespuestaSesion> {
    const email = dto.email.toLowerCase();
    await this.emailLibre(email);
    const cuenta = await this.db.cuenta.create({
      data: {
        email,
        clave: await hashearClave(dto.clave),
        rol: Rol.USUARIO,
        estado: EstadoCuenta.APROBADA,
        usuario: {
          create: {
            nombre: dto.nombre.trim().replace(/\s+/g, ' '),
            dni: normalizarDni(dto.dni),
            telefono: dto.telefono.trim(),
            direccion: dto.direccion.trim(),
            notas: dto.notas?.trim() || null,
            zona: zonaDb(dto.zona),
          },
        },
      },
    });
    return this.sesion(cuenta);
  }

  async registrarKiosco(dto: RegistroKioscoDto): Promise<RespuestaSesion> {
    const email = dto.email.toLowerCase();
    await this.emailLibre(email);
    const { lat, lng } = geolocalizar(dto.direccion, dto.zona);
    const cuenta = await this.db.cuenta.create({
      data: {
        email,
        clave: await hashearClave(dto.clave),
        rol: Rol.KIOSCO,
        estado: EstadoCuenta.PENDIENTE,
        kiosco: {
          create: { nombre: dto.nombre.trim(), direccion: dto.direccion.trim(), zona: zonaDb(dto.zona), lat, lng, aliasCobro: dto.aliasCobro },
        },
      },
    });
    this.eventos.emitir({ tipo: 'alta', cuentaId: cuenta.id });
    return this.sesion(cuenta);
  }

  async registrarRider(dto: RegistroRiderDto): Promise<RespuestaSesion> {
    const email = dto.email.toLowerCase();
    await this.emailLibre(email);
    const cuenta = await this.db.cuenta.create({
      data: {
        email,
        clave: await hashearClave(dto.clave),
        rol: Rol.RIDER,
        estado: EstadoCuenta.PENDIENTE,
        rider: {
          create: {
            nombre: dto.nombre.trim().replace(/\s+/g, ' '),
            telefono: dto.telefono.trim(),
            dni: normalizarDni(dto.dni),
            vehiculoModelo: dto.vehiculoModelo.trim(),
            patente: normalizarPatente(dto.patente),
            aliasCbu: dto.aliasCbu,
            zonas: [],
            documentos: { create: [documentoParaGuardar('seguro', dto.seguro), documentoParaGuardar('licencia', dto.licencia)] },
          },
        },
      },
    });
    this.eventos.emitir({ tipo: 'alta', cuentaId: cuenta.id });
    return this.sesion(cuenta);
  }

  async ingresar(email: string, clave: string): Promise<RespuestaSesion> {
    const cuenta = await this.db.cuenta.findUnique({ where: { email: email.toLowerCase() } });
    // Mismo mensaje si no existe o si la clave no coincide.
    if (!cuenta || !(await verificarClave(clave, cuenta.clave))) throw new UnauthorizedException('Email o contraseña incorrectos.');
    return this.sesion(cuenta);
  }

  /**
   * El link de recuperación se firma con el secreto y el hash de la clave actual:
   * vence a los MINUTOS_RECUPERACION y deja de servir apenas se cambia la clave (un solo uso).
   */
  private secretoRecuperacion(claveGuardada: string): string {
    return `${this.config.getOrThrow<string>('JWT_SECRET')}:${claveGuardada}`;
  }

  /**
   * Manda por mail el link para elegir una contraseña nueva. Responde igual exista o no la cuenta,
   * para no revelar qué emails están registrados; el mail sale sin esperar.
   */
  async pedirRecuperacion(email: string): Promise<void> {
    const cuenta = await this.db.cuenta.findUnique({ where: { email: email.toLowerCase() } });
    const app = cuenta && APP_DEL_ROL[cuenta.rol];
    if (!cuenta || !app) return;
    const token = await this.jwt.signAsync({ sub: cuenta.id }, { secret: this.secretoRecuperacion(cuenta.clave), expiresIn: `${MINUTOS_RECUPERACION}m` });
    const link = `${this.config.get<string>(app.variable) ?? app.local}/restablecer?token=${encodeURIComponent(token)}`;
    void this.correo.enviar(
      cuenta.email,
      'Elegí una contraseña nueva para FreeDeli',
      [
        'Hola,',
        '',
        'Pediste cambiar la contraseña de tu cuenta de FreeDeli. Entrá a este link para elegir una nueva:',
        link,
        '',
        `El link vence en ${MINUTOS_RECUPERACION} minutos y sirve una sola vez.`,
        'Si no lo pediste, ignorá este mail: tu contraseña no cambia.',
      ].join('\n'),
    );
  }

  /** Cambia la contraseña con el link del mail y deja la sesión iniciada. */
  async restablecer(token: string, clave: string): Promise<RespuestaSesion> {
    const sub = this.jwt.decode<{ sub?: string } | null>(token)?.sub;
    const cuenta = sub ? await this.db.cuenta.findUnique({ where: { id: sub } }) : null;
    if (!cuenta || !APP_DEL_ROL[cuenta.rol]) throw new BadRequestException(LINK_VENCIDO);
    try {
      await this.jwt.verifyAsync(token, { secret: this.secretoRecuperacion(cuenta.clave) });
    } catch {
      throw new BadRequestException(LINK_VENCIDO);
    }
    const actualizada = await this.db.cuenta.update({ where: { id: cuenta.id }, data: { clave: await hashearClave(clave) } });
    return this.sesion(actualizada);
  }

  /** Estado actual de la cuenta con un token nuevo (por ejemplo, recién aprobada). */
  async renovar(id: string): Promise<RespuestaSesion> {
    const cuenta = await this.db.cuenta.findUnique({ where: { id } });
    if (!cuenta) throw new UnauthorizedException('La cuenta ya no existe.');
    return this.sesion(cuenta);
  }
}
