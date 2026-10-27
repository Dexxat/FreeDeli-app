import { BadRequestException, Injectable, NotFoundException, type PipeTransform } from '@nestjs/common';
import { SIN_DOCUMENTOS, TIPOS_DOCUMENTO, esTipoDocumento, partesDeImagen, type DocumentosRider, type TipoDocumento } from '../dominio.js';
import { TipoDocumento as TipoDocumentoDb } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const A_DB: Record<TipoDocumento, TipoDocumentoDb> = { seguro: TipoDocumentoDb.SEGURO, licencia: TipoDocumentoDb.LICENCIA };

/** Valida el tipo de documento de la ruta (seguro o licencia). */
export class TipoDocumentoPipe implements PipeTransform<string, TipoDocumento> {
  transform(valor: string): TipoDocumento {
    if (!esTipoDocumento(valor)) throw new NotFoundException('Ese documento no existe.');
    return valor;
  }
}

/** Lo que se guarda de una foto: tipo de imagen y bytes. La data URL ya viene validada. */
export function documentoParaGuardar(tipo: TipoDocumento, dataUrl: string) {
  const partes = partesDeImagen(dataUrl);
  if (!partes) throw new BadRequestException('La foto tiene que ser JPEG, PNG o WebP.');
  return { tipo: A_DB[tipo], mime: partes.mime, datos: new Uint8Array(Buffer.from(partes.base64, 'base64')) };
}

/** Fotos del seguro y la licencia de los riders. */
@Injectable()
export class DocumentosService {
  constructor(private readonly db: PrismaService) {}

  async leer(riderId: string): Promise<DocumentosRider> {
    const docs = await this.db.documentoRider.findMany({ where: { riderId } });
    const resultado: DocumentosRider = { ...SIN_DOCUMENTOS };
    for (const { id } of TIPOS_DOCUMENTO) {
      const doc = docs.find((d) => d.tipo === A_DB[id]);
      resultado[id] = doc ? `data:${doc.mime};base64,${Buffer.from(doc.datos).toString('base64')}` : null;
    }
    return resultado;
  }

  async guardar(riderId: string, tipo: TipoDocumento, dataUrl: string): Promise<DocumentosRider> {
    const doc = documentoParaGuardar(tipo, dataUrl);
    await this.db.documentoRider.upsert({
      where: { riderId_tipo: { riderId, tipo: doc.tipo } },
      create: { riderId, ...doc },
      update: { mime: doc.mime, datos: doc.datos },
    });
    return this.leer(riderId);
  }

  /** Para Dev: falla si el rider no existe. */
  async deRider(riderId: string): Promise<DocumentosRider> {
    if (!(await this.db.rider.findUnique({ where: { id: riderId }, select: { id: true } }))) throw new NotFoundException('No existe ese rider.');
    return this.leer(riderId);
  }
}
