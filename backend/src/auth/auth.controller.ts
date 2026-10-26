import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CredencialesDto, RegistroKioscoDto, RegistroRiderDto, RegistroUsuarioDto } from './dto.js';
import { PermitirPendiente, Publico, SesionActual, type Sesion } from './sesion.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico() @Post('registro/usuario')
  registrarUsuario(@Body() dto: RegistroUsuarioDto) {
    return this.auth.registrarUsuario(dto);
  }

  /** Queda pendiente hasta que FreeDeli Dev la apruebe. */
  @Publico() @Post('registro/kiosco')
  registrarKiosco(@Body() dto: RegistroKioscoDto) {
    return this.auth.registrarKiosco(dto);
  }

  /** Queda pendiente hasta que FreeDeli Dev la apruebe. */
  @Publico() @Post('registro/rider')
  registrarRider(@Body() dto: RegistroRiderDto) {
    return this.auth.registrarRider(dto);
  }

  @Publico() @Post('ingresar') @HttpCode(200)
  ingresar(@Body() dto: CredencialesDto) {
    return this.auth.ingresar(dto.email, dto.clave);
  }

  /** Estado actual de la cuenta y un token nuevo. Sirve para seguir de largo cuando Dev la aprueba. */
  @PermitirPendiente() @Get('yo')
  yo(@SesionActual() sesion: Sesion) {
    return this.auth.renovar(sesion.sub);
  }
}
