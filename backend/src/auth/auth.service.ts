import { ConflictException, Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { geolocalizar, zonaDb } from '../comun/zonas.js';
import { EstadoCuenta, Rol } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashearClave, verificarClave } from './clave.js';
import type { RegistroKioscoDto, RegistroRiderDto, RegistroUsuarioDto } from './dto.js';
import type { Sesion } from './sesion.js';
import { EventosService } from '../eventos/eventos.service.js';

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
    const { lat, lng } = geolocalizar(dto.direccion, dto.zona);
    const [nombre, apellido] = dto.nombre.trim().split(/\s+/);
    const cuenta = await this.db.cuenta.create({
      data: {
        email,
        clave: await hashearClave(dto.clave),
        rol: Rol.USUARIO,
        estado: EstadoCuenta.APROBADA,
        usuario: {
          create: {
            nombre,
            nombreCorto: apellido ? `${nombre} ${apellido[0]}.` : nombre,
            telefono: dto.telefono,
            direccion: dto.direccion.trim(),
            notas: dto.notas?.trim() || null,
            zona: zonaDb(dto.zona),
            lat,
            lng,
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
            nombre: dto.nombre.trim(),
            telefono: dto.telefono,
            dni: dto.dni,
            vehiculoModelo: dto.vehiculoModelo.trim(),
            patente: dto.patente.toUpperCase(),
            aliasCbu: dto.aliasCbu,
            zonas: [],
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

  /** Estado actual de la cuenta con un token nuevo (por ejemplo, recién aprobada). */
  async renovar(id: string): Promise<RespuestaSesion> {
    const cuenta = await this.db.cuenta.findUnique({ where: { id } });
    if (!cuenta) throw new UnauthorizedException('La cuenta ya no existe.');
    return this.sesion(cuenta);
  }
}
