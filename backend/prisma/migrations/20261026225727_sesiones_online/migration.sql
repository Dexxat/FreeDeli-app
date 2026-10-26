-- CreateTable
CREATE TABLE "SesionOnline" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),

    CONSTRAINT "SesionOnline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SesionOnline_riderId_desde_idx" ON "SesionOnline"("riderId", "desde");

-- AddForeignKey
ALTER TABLE "SesionOnline" ADD CONSTRAINT "SesionOnline_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
