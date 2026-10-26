"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASOS_ESTADO = void 0;
exports.subtotalProductos = subtotalProductos;
exports.totalPedido = totalPedido;
exports.codigoPedido = codigoPedido;
exports.cantidadProductos = cantidadProductos;
exports.PASOS_ESTADO = [
    { id: 'aceptado', etiqueta: 'Aceptado' },
    { id: 'retirado', etiqueta: 'Retirado' },
    { id: 'en-camino', etiqueta: 'En camino' },
    { id: 'entregado', etiqueta: 'Entregado' },
];
function subtotalProductos(p) {
    return p.items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
}
function totalPedido(p) {
    return subtotalProductos(p) + p.costoEnvio;
}
function codigoPedido(p) {
    return `#A-${p.numero}`;
}
function cantidadProductos(p) {
    return p.items.reduce((acc, i) => acc + i.cantidad, 0);
}
//# sourceMappingURL=pedido.js.map