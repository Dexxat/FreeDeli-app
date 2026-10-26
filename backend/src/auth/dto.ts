import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ZONAS_API, type ZonaApi } from '../comun/zonas.js';

export class CredencialesDto {
  @IsEmail({}, { message: 'Ingresá un email válido.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña tiene que tener al menos 8 caracteres.' })
  @MaxLength(100)
  clave!: string;
}

const TELEFONO = /^[\d\s\-+()]{10,20}$/;
const ALIAS_O_CBU = /^(\d{22}|[A-Za-z0-9.-]{6,20})$/;

export class RegistroUsuarioDto extends CredencialesDto {
  @IsString() @MinLength(2) @MaxLength(60)
  nombre!: string;

  @Matches(TELEFONO, { message: 'Ingresá un teléfono con código de área.' })
  telefono!: string;

  @IsString() @Matches(/\d/, { message: 'Ingresá la calle y la altura.' }) @MaxLength(120)
  direccion!: string;

  @IsOptional() @IsString() @MaxLength(120)
  notas?: string;

  @IsIn(ZONAS_API, { message: 'Zona inválida.' })
  zona!: ZonaApi;
}

export class RegistroKioscoDto extends CredencialesDto {
  @IsString() @MinLength(3) @MaxLength(60)
  nombre!: string;

  @IsString() @Matches(/\d/, { message: 'Ingresá la calle y la altura.' }) @MaxLength(120)
  direccion!: string;

  @IsIn(ZONAS_API, { message: 'Zona inválida.' })
  zona!: ZonaApi;

  @Matches(ALIAS_O_CBU, { message: 'Alias de 6 a 20 caracteres o CBU de 22 dígitos.' })
  aliasCobro!: string;
}

export class RegistroRiderDto extends CredencialesDto {
  @IsString() @MinLength(3) @MaxLength(60)
  nombre!: string;

  @Matches(TELEFONO, { message: 'Ingresá un teléfono con código de área.' })
  telefono!: string;

  @Matches(/^[\d.]{7,10}$/, { message: 'DNI inválido.' })
  dni!: string;

  @IsString() @MinLength(2) @MaxLength(60)
  vehiculoModelo!: string;

  @Matches(/^(\d{3}[A-Za-z]{3}|[A-Za-z]\d{3}[A-Za-z]{3})$/, { message: 'Usá el formato A123BCD o 123ABC.' })
  patente!: string;

  @Matches(ALIAS_O_CBU, { message: 'Alias de 6 a 20 caracteres o CBU de 22 dígitos.' })
  aliasCbu!: string;
}
