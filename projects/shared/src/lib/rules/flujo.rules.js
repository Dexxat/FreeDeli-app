"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmarStock = confirmarStock;
exports.aceptarAjuste = aceptarAjuste;
exports.cancelarPorCliente = cancelarPorCliente;
exports.confirmarTransferencia = confirmarTransferencia;
exports.asignarRider = asignarRider;
exports.aprobarRider = aprobarRider;
exports.confirmarRetiro = confirmarRetiro;
exports.salirEnCamino = salirEnCamino;
exports.entregarConPin = entregarConPin;
exports.quienDebeActuar = quienDebeActuar;
const pedido_js_1 = require("../models/pedido.js");
const pedido_rules_js_1 = require("./pedido.rules.js");
const ok = (pedido) => ({ ok: true, pedido });
const error = (texto) => ({ ok: false, error: texto });
function enFase(p, fase) {
    return p.estado === 'esperando' && p.fase === fase;
}
function confirmarStock(p, faltantes, comisionPorcentaje) {
    if (!enFase(p, 'stock'))
        return error('El pedido no está esperando confirmación de stock.');
    if (faltantes.length === 0)
        return ok({ ...p, fase: 'transferencia' });
    const items = p.items.filter((i) => !faltantes.includes(i.productoId));
    const itemsQuitados = p.items.filter((i) => faltantes.includes(i.productoId));
    if (items.length === 0)
        return ok({ ...p, items: [], itemsQuitados, estado: 'cancelado', fase: undefined });
    return ok({
        ...p,
        items,
        itemsQuitados,
        comisionFreeDeli: (0, pedido_rules_js_1.calcularComision)((0, pedido_js_1.subtotalProductos)({ items }), comisionPorcentaje),
        fase: 'ajuste',
    });
}
function aceptarAjuste(p) {
    if (!enFase(p, 'ajuste'))
        return error('No hay un ajuste para aceptar.');
    return ok({ ...p, fase: 'transferencia' });
}
function cancelarPorCliente(p) {
    if (p.estado !== 'esperando' || !['stock', 'ajuste', 'transferencia'].includes(p.fase ?? '')) {
        return error('El pedido ya no se puede cancelar desde la app.');
    }
    return ok({ ...p, estado: 'cancelado', fase: undefined });
}
function confirmarTransferencia(p) {
    if (!enFase(p, 'transferencia'))
        return error('El pedido no está esperando la transferencia.');
    return ok({ ...p, pago: 'transferido', fase: 'rider' });
}
function asignarRider(p, riderId) {
    if (!enFase(p, 'rider'))
        return error('Este pedido ya no está disponible.');
    if (p.ridersRechazados?.includes(riderId))
        return error('El kiosco ya rechazó a este rider para el pedido.');
    return ok({ ...p, riderId, fase: 'aprobacion' });
}
function aprobarRider(p, aprobado, ahora) {
    if (!enFase(p, 'aprobacion') || !p.riderId)
        return error('No hay un rider para aprobar.');
    if (aprobado)
        return ok({ ...p, estado: 'aceptado', fase: undefined, aceptadoEn: ahora });
    return ok({
        ...p,
        riderId: undefined,
        fase: 'rider',
        ridersRechazados: [...(p.ridersRechazados ?? []), p.riderId],
    });
}
function confirmarRetiro(p, quien, ahora) {
    if (p.estado !== 'aceptado')
        return error('El pedido no está listo para retirar.');
    const retiro = { ...p.retiro, [quien]: p.retiro?.[quien] ?? ahora };
    return ok({ ...p, retiro, estado: retiro.kiosco && retiro.rider ? 'retirado' : 'aceptado' });
}
function salirEnCamino(p) {
    if (p.estado !== 'retirado')
        return error('Primero tiene que estar retirado.');
    return ok({ ...p, estado: 'en-camino' });
}
function entregarConPin(p, pin, ahora) {
    if (p.estado !== 'en-camino')
        return error('Este pedido todavía no está en camino.');
    if (p.pin !== pin)
        return error('PIN incorrecto.');
    return ok({ ...p, estado: 'entregado', entregadoEn: ahora, pago: 'liberado' });
}
function quienDebeActuar(p) {
    if (p.estado === 'esperando') {
        switch (p.fase) {
            case 'stock':
            case 'transferencia':
            case 'aprobacion':
                return 'kiosco';
            case 'ajuste':
                return 'cliente';
            case 'rider':
                return 'rider';
            default:
                return null;
        }
    }
    if (p.estado === 'aceptado') {
        if (!p.retiro?.kiosco && !p.retiro?.rider)
            return 'kiosco-y-rider';
        return p.retiro?.kiosco ? 'rider' : 'kiosco';
    }
    if (p.estado === 'retirado' || p.estado === 'en-camino')
        return 'rider';
    return null;
}
//# sourceMappingURL=flujo.rules.js.map