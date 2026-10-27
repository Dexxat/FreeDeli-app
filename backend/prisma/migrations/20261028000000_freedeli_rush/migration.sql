-- AlterEnum
ALTER TYPE "TipoMovimientoSaldo" ADD VALUE 'PREMIO';

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "descuentoPremio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enCaminoEn" TIMESTAMP(3),
ADD COLUMN     "estrellaGanada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "estrellas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saldoFavor" INTEGER NOT NULL DEFAULT 0;

