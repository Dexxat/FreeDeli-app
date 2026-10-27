-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('SEGURO', 'LICENCIA');

-- CreateTable
CREATE TABLE "DocumentoRider" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "mime" TEXT NOT NULL,
    "datos" BYTEA NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoRider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoRider_riderId_tipo_key" ON "DocumentoRider"("riderId", "tipo");

-- AddForeignKey
ALTER TABLE "DocumentoRider" ADD CONSTRAINT "DocumentoRider_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

