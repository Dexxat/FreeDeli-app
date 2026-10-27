import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Cumple } from '../comun/validar.js';
import { ZONAS_API, type ZonaApi } from '../comun/zonas.js';
import { aliasCbuValido, dniValido, nombreCompletoValido, patenteValida, telefonoValido } from '../dominio.js';

/** Mensajes de validación compartidos por los formularios de alta y de ajustes. */
export const MENSAJES = {
  email: 'Ingresá un email válido.',
  nombre: 'Ingresá tu nombre y apellido.',
  dni: 'DNI inválido.',
  telefono: 'Ingresá un teléfono con código de área.',
  patente: 'Usá el formato A123BCD o 123ABC.',
  aliasCbu: 'Alias de 6 a 20 caracteres o CBU de 22 dígitos.',
  direccion: 'Ingresá la calle y la altura.',
  zona: 'Zona inválida.',
} as const;

export class CredencialesDto {
  @IsEmail({}, { message: MENSAJES.email })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña tiene que tener al menos 8 caracteres.' })
  @MaxLength(100)
  clave!: string;
}

/** Datos personales de usuarios y riders: en el alta y en Ajustes. */
export class DatosPersonalesDto {
  @Cumple(nombreCompletoValido, MENSAJES.nombre)
  nombre!: string;

  @Cumple(dniValido, MENSAJES.dni)
  dni!: string;

  @IsEmail({}, { message: MENSAJES.email })
  email!: string;

  @Cumple(telefonoValido, MENSAJES.telefono)
  telefono!: string;
}

export class RegistroUsuarioDto extends CredencialesDto {
  @Cumple(nombreCompletoValido, MENSAJES.nombre)
  nombre!: string;

  @Cumple(dniValido, MENSAJES.dni)
  dni!: string;

  @Cumple(telefonoValido, MENSAJES.telefono)
  telefono!: string;

  @IsString() @Matches(/\d/, { message: MENSAJES.direccion }) @MaxLength(120)
  direccion!: string;

  @IsOptional() @IsString() @MaxLength(120)
  notas?: string;

  @IsIn(ZONAS_API, { message: MENSAJES.zona })
  zona!: ZonaApi;
}

export class RegistroKioscoDto extends CredencialesDto {
  @IsString() @MinLength(3) @MaxLength(60)
  nombre!: string;

  @IsString() @Matches(/\d/, { message: MENSAJES.direccion }) @MaxLength(120)
  direccion!: string;

  @IsIn(ZONAS_API, { message: MENSAJES.zona })
  zona!: ZonaApi;

  @Cumple(aliasCbuValido, MENSAJES.aliasCbu)
  aliasCobro!: string;
}

export class RegistroRiderDto extends CredencialesDto {
  @Cumple(nombreCompletoValido, MENSAJES.nombre)
  nombre!: string;

  @Cumple(telefonoValido, MENSAJES.telefono)
  telefono!: string;

  @Cumple(dniValido, MENSAJES.dni)
  dni!: string;

  @IsString() @MinLength(2) @MaxLength(60)
  vehiculoModelo!: string;

  @Cumple(patenteValida, MENSAJES.patente)
  patente!: string;

  @Cumple(aliasCbuValido, MENSAJES.aliasCbu)
  aliasCbu!: string;
}
