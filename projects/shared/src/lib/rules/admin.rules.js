"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINUTOS_DEMORA = exports.SALDO_BAJO = void 0;
exports.movimientoDePedido = movimientoDePedido;
const pedido_js_1 = require("../models/pedido.js");
exports.SALDO_BAJO = 10_000;
exports.MINUTOS_DEMORA = 10;
function movimientoDePedido(p) {
    const cancelado = p.estado === 'cancelado';
    const totalCliente = cancelado ? 0 : (0, pedido_js_1.totalPedido)(p);
    const envioRider = cancelado ? 0 : p.gananciaRider + p.propina;
    const comisionFreeDeli = cancelado ? 0 : p.comisionFreeDeli;
    return {
        pedidoId: p.id,
        numero: p.numero,
        fecha: p.creadoEn,
        estado: p.estado,
        pago: p.pago,
        totalCliente,
        envioRider,
        comisionFreeDeli,
        netoKiosco: totalCliente - envioRider - comisionFreeDeli,
    };
}
//# sourceMappingURL=admin.rules.js.map