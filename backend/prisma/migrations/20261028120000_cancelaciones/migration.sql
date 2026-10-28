-- CreateEnum
CREATE TYPE "MotivoCancelacion" AS ENUM ('CLIENTE', 'SIN_RIDER', 'SIN_STOCK', 'RIDER', 'DEV');

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "buscandoRiderDesde" TIMESTAMP(3),
ADD COLUMN     "motivoCancelacion" "MotivoCancelacion",
ADD COLUMN     "reintegradoEn" TIMESTAMP(3),
ADD COLUMN     "reintegro" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "riderCobra" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "habilitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "habilitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pausado" BOOLEAN NOT NULL DEFAULT false;

