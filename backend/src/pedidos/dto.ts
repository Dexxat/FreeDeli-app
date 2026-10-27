import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { MENSAJES } from '../auth/dto.js';
import { Cumple } from '../comun/validar.js';
import { ZONAS_API, type ZonaApi } from '../comun/zonas.js';
import { aliasCbuValido, celularValido, dniValido, nombreCompletoValido, patenteValida } from '../dominio.js';

export class LineaDto {
  @IsUUID() productoId!: string;
  @IsInt() @Min(1) @Max(20) cantidad!: number;
}

export class NuevoPedidoDto {
  @IsUUID() kioscoId!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => LineaDto)
  items!: LineaDto[];
}

export class StockDto {
  @IsArray() @IsUUID('all', { each: true }) faltantes!: string[];
}

export class AprobarRiderDto {
  @IsBoolean() aprobado!: boolean;
}

export class PinDto {
  @Matches(/^\d{4}$/, { message: 'El PIN tiene 4 dígitos.' }) pin!: string;
}

export class EstadoRiderDto {
  @IsOptional() @IsBoolean() disponible?: boolean;
  @IsOptional() @IsArray() @ArrayMinSize(1, { message: 'Elegí al menos una zona.' }) @IsIn(ZONAS_API, { each: true }) zonas?: ZonaApi[];
}

export class ProductoDto {
  @IsString() @MinLength(2) @MaxLength(60) nombre!: string;
  @IsInt() @Min(1) @Max(10_000_000) precio!: number;
  @IsOptional() @IsBoolean() disponible?: boolean;
}

export class CambiosProductoDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) nombre?: string;
  @IsOptional() @IsInt() @Min(1) @Max(10_000_000) precio?: number;
  @IsOptional() @IsBoolean() disponible?: boolean;
}

export class DatosKioscoDto {
  @IsString() @MinLength(3) @MaxLength(60) nombre!: string;
  @IsString() @Matches(/\d/, { message: 'Ingresá la calle y la altura.' }) @MaxLength(120) direccion!: string;
  @Matches(/^(\d{22}|[A-Za-z0-9.-]{6,20})$/, { message: 'Alias de 6 a 20 caracteres o CBU de 22 dígitos.' }) aliasCobro!: string;
  @IsInt() @Min(5) @Max(120) tiempoEstimadoMin!: number;
}

export class PausaDto {
  @IsBoolean() pausado!: boolean;
}

/** Cambios del perfil del rider: cada sección de Ajustes manda solo lo suyo. */
export class PerfilRiderDto {
  @IsOptional() @Cumple(nombreCompletoValido, MENSAJES.nombre) nombre?: string;
  @IsOptional() @Cumple(dniValido, MENSAJES.dni) dni?: string;
  @IsOptional() @IsEmail({}, { message: MENSAJES.email }) email?: string;
  @IsOptional() @Cumple(celularValido, MENSAJES.celular) telefono?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) vehiculoModelo?: string;
  @IsOptional() @Cumple(patenteValida, MENSAJES.patente) patente?: string;
  @IsOptional() @Cumple(aliasCbuValido, MENSAJES.aliasCbu) aliasCbu?: string;
  @IsOptional() @IsBoolean() notificaciones?: boolean;
  @IsOptional() @IsBoolean() sonidos8bit?: boolean;
}

export class CargaSaldoDto {
  @IsInt() @Min(1) monto!: number;
  @IsOptional() @IsString() @MaxLength(80) referencia?: string;
}
