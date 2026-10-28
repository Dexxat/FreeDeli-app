-- El pedido se entrega donde estaba el GPS del cliente al pedir, y guarda la última posición del rider.
ALTER TABLE "Pedido" ADD COLUMN     "destinoLat" DOUBLE PRECISION,
ADD COLUMN     "destinoLng" DOUBLE PRECISION,
ADD COLUMN     "riderLat" DOUBLE PRECISION,
ADD COLUMN     "riderLng" DOUBLE PRECISION,
ADD COLUMN     "riderPosicionEn" TIMESTAMP(3);

-- Los pedidos anteriores se entregaban en la dirección geolocalizada del usuario.
UPDATE "Pedido" p SET "destinoLat" = u."lat", "destinoLng" = u."lng" FROM "Usuario" u WHERE u."id" = p."usuarioId";

ALTER TABLE "Pedido" ALTER COLUMN "destinoLat" SET NOT NULL,
ALTER COLUMN "destinoLng" SET NOT NULL;

-- La ubicación del cliente ya no sale de su dirección: la manda el GPS con cada pedido.
ALTER TABLE "Usuario" DROP COLUMN "lat",
DROP COLUMN "lng";
