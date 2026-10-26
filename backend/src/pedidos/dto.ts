import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { ZONAS_API, type ZonaApi } from '../comun/zonas.js';

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

export class CargaSaldoDto {
  @IsInt() @Min(1) monto!: number;
  @IsOptional() @IsString() @MaxLength(80) referencia?: string;
}
