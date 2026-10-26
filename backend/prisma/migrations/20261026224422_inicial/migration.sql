-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('USUARIO', 'KIOSCO', 'RIDER', 'DEV');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "Zona" AS ENUM ('SAN_MIGUEL', 'MUNIZ', 'BELLA_VISTA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('ESPERANDO', 'ACEPTADO', 'RETIRADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FasePedido" AS ENUM ('STOCK', 'AJUSTE', 'TRANSFERENCIA', 'RIDER', 'APROBACION');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'TRANSFERIDO', 'LIBERADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoSaldo" AS ENUM ('CARGA', 'COMISION');

-- CreateEnum
CREATE TYPE "TipoConflicto" AS ENUM ('DEMORA', 'PRODUCTO', 'PAGO', 'RIDER', 'KIOSCO', 'CLIENTE', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoConflicto" AS ENUM ('ABIERTO', 'EN_SEGUIMIENTO', 'RESUELTO');

-- CreateTable
CREATE TABLE "Cuenta" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "estado" "EstadoCuenta" NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreCorto" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "notas" TEXT,
    "zona" "Zona" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kiosco" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT,
    "nombre" TEXT NOT NULL,
    "zona" "Zona" NOT NULL,
    "direccion" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "abierto" BOOLEAN NOT NULL DEFAULT true,
    "pausado" BOOLEAN NOT NULL DEFAULT false,
    "saldo" INTEGER NOT NULL DEFAULT 0,
    "tiempoEstimadoMin" INTEGER NOT NULL DEFAULT 25,
    "aliasCobro" TEXT NOT NULL,

    CONSTRAINT "Kiosco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "kioscoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" INTEGER NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "vehiculoModelo" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "aliasCbu" TEXT NOT NULL,
    "notificaciones" BOOLEAN NOT NULL DEFAULT true,
    "sonidos8bit" BOOLEAN NOT NULL DEFAULT true,
    "disponible" BOOLEAN NOT NULL DEFAULT false,
    "zonas" "Zona"[],
    "pausado" BOOLEAN NOT NULL DEFAULT false,
    "riderDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "zona" "Zona" NOT NULL,
    "kioscoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "destinoNombre" TEXT NOT NULL,
    "destinoDireccion" TEXT NOT NULL,
    "destinoNotas" TEXT,
    "distanciaKm" DOUBLE PRECISION NOT NULL,
    "costoEnvio" INTEGER NOT NULL,
    "propina" INTEGER NOT NULL DEFAULT 0,
    "gananciaRider" INTEGER NOT NULL,
    "pago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "aliasKiosco" TEXT NOT NULL,
    "comisionFreeDeli" INTEGER NOT NULL,
    "pin" TEXT NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'ESPERANDO',
    "fase" "FasePedido" DEFAULT 'STOCK',
    "ridersRechazados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retiroKiosco" TIMESTAMP(3),
    "retiroRider" TIMESTAMP(3),
    "riderId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aceptadoEn" TIMESTAMP(3),
    "entregadoEn" TIMESTAMP(3),

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" INTEGER NOT NULL,
    "quitado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoSaldo" (
    "id" TEXT NOT NULL,
    "kioscoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoMovimientoSaldo" NOT NULL,
    "monto" INTEGER NOT NULL,
    "referencia" TEXT NOT NULL,
    "saldoResultante" INTEGER NOT NULL,

    CONSTRAINT "MovimientoSaldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conflicto" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT,
    "tipo" "TipoConflicto" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoConflicto" NOT NULL DEFAULT 'ABIERTO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltoEn" TIMESTAMP(3),

    CONSTRAINT "Conflicto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaConflicto" (
    "id" TEXT NOT NULL,
    "conflictoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texto" TEXT NOT NULL,

    CONSTRAINT "NotaConflicto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cuenta_email_key" ON "Cuenta"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cuentaId_key" ON "Usuario"("cuentaId");

-- CreateIndex
CREATE UNIQUE INDEX "Kiosco_cuentaId_key" ON "Kiosco"("cuentaId");

-- CreateIndex
CREATE INDEX "Producto_kioscoId_idx" ON "Producto"("kioscoId");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_cuentaId_key" ON "Rider"("cuentaId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE INDEX "Pedido_kioscoId_estado_idx" ON "Pedido"("kioscoId", "estado");

-- CreateIndex
CREATE INDEX "Pedido_usuarioId_estado_idx" ON "Pedido"("usuarioId", "estado");

-- CreateIndex
CREATE INDEX "Pedido_riderId_estado_idx" ON "Pedido"("riderId", "estado");

-- CreateIndex
CREATE INDEX "Pedido_creadoEn_idx" ON "Pedido"("creadoEn");

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "Oferta_pedidoId_riderId_key" ON "Oferta"("pedidoId", "riderId");

-- CreateIndex
CREATE INDEX "MovimientoSaldo_kioscoId_fecha_idx" ON "MovimientoSaldo"("kioscoId", "fecha");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kiosco" ADD CONSTRAINT "Kiosco_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_kioscoId_fkey" FOREIGN KEY ("kioscoId") REFERENCES "Kiosco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_kioscoId_fkey" FOREIGN KEY ("kioscoId") REFERENCES "Kiosco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoSaldo" ADD CONSTRAINT "MovimientoSaldo_kioscoId_fkey" FOREIGN KEY ("kioscoId") REFERENCES "Kiosco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conflicto" ADD CONSTRAINT "Conflicto_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaConflicto" ADD CONSTRAINT "NotaConflicto_conflictoId_fkey" FOREIGN KEY ("conflictoId") REFERENCES "Conflicto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
