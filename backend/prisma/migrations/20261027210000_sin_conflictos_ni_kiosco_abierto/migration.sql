-- DropForeignKey
ALTER TABLE "Conflicto" DROP CONSTRAINT "Conflicto_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "NotaConflicto" DROP CONSTRAINT "NotaConflicto_conflictoId_fkey";

-- AlterTable
ALTER TABLE "Kiosco" DROP COLUMN "abierto";

-- DropTable
DROP TABLE "Conflicto";

-- DropTable
DROP TABLE "NotaConflicto";

-- DropEnum
DROP TYPE "EstadoConflicto";

-- DropEnum
DROP TYPE "TipoConflicto";

