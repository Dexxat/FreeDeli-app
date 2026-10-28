import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ZONAS_API, type ZonaApi } from '../comun/zonas.js';
import { UbicacionDto } from '../pedidos/dto.js';

export class DireccionDto {
  @IsString() @Matches(/\d/, { message: 'Ingresá la calle y la altura.' }) @MaxLength(120) direccion!: string;
  @IsOptional() @IsString() @MaxLength(120) notas?: string;
  @IsIn(ZONAS_API, { message: 'Zona inválida.' }) zona!: ZonaApi;
}

/** Kioscos abiertos cerca del GPS del cliente, de una zona o de todas. */
export class BusquedaKioscosDto extends UbicacionDto {
  @IsOptional() @IsIn(ZONAS_API, { message: 'Zona inválida.' }) zona?: ZonaApi;
}
