import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CredencialesDto, RecuperarDto, RegistroKioscoDto, RegistroRiderDto, RegistroUsuarioDto, RestablecerDto } from './dto.js';
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

  /** Manda el link para elegir una contraseña nueva. Responde lo mismo exista o no la cuenta. */
  @Publico() @Post('recuperar') @HttpCode(204)
  async recuperar(@Body() dto: RecuperarDto): Promise<void> {
    await this.auth.pedirRecuperacion(dto.email);
  }

  /** Contraseña nueva con el link del mail. Deja la sesión iniciada. */
  @Publico() @Post('restablecer') @HttpCode(200)
  restablecer(@Body() dto: RestablecerDto) {
    return this.auth.restablecer(dto.token, dto.clave);
  }

  /** Estado actual de la cuenta y un token nuevo. Sirve para seguir de largo cuando Dev la aprueba. */
  @PermitirPendiente() @Get('yo')
  yo(@SesionActual() sesion: Sesion) {
    return this.auth.renovar(sesion.sub);
  }
}
