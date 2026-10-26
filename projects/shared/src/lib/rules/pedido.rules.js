"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESTADOS_ABIERTOS = exports.SEGUNDOS_PARA_ACEPTAR = exports.COMISION_MINIMA = exports.PEDIDO_MINIMO = void 0;
exports.generarPin = generarPin;
exports.pinValido = pinValido;
exports.siguienteEstado = siguienteEstado;
exports.estadosDeBarra = estadosDeBarra;
exports.distanciaKm = distanciaKm;
exports.costoEnvio = costoEnvio;
exports.puedeRecibirPedidos = puedeRecibirPedidos;
exports.calcularComision = calcularComision;
exports.direccionAproximada = direccionAproximada;
exports.armarOferta = armarOferta;
exports.rangoTiempo = rangoTiempo;
exports.minutosParaLlegar = minutosParaLlegar;
const pedido_js_1 = require("../models/pedido.js");
function generarPin(random = Math.random) {
    return Math.floor(random() * 10000)
        .toString()
        .padStart(4, '0');
}
function pinValido(pin) {
    return /^\d{4}$/.test(pin);
}
const SIGUIENTE = {
    esperando: 'aceptado',
    aceptado: 'retirado',
    retirado: 'en-camino',
};
function siguienteEstado(estado) {
    return SIGUIENTE[estado] ?? null;
}
function estadosDeBarra(estado) {
    const indiceActual = pedido_js_1.PASOS_ESTADO.findIndex((p) => p.id === estado);
    const resultado = {};
    pedido_js_1.PASOS_ESTADO.forEach((paso, i) => {
        if (estado === 'entregado' || (indiceActual >= 0 && i < indiceActual)) {
            resultado[paso.id] = 'completado';
        }
        else if (i === indiceActual) {
            resultado[paso.id] = 'actual';
        }
        else {
            resultado[paso.id] = 'pendiente';
        }
    });
    return resultado;
}
function distanciaKm(a, b) {
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}
function costoEnvio(km, tarifa) {
    return Math.ceil((tarifa.base + tarifa.porKm * km) / 100) * 100;
}
exports.PEDIDO_MINIMO = 15_000;
function puedeRecibirPedidos(k) {
    return k.abierto && !k.pausado && k.saldo >= exports.COMISION_MINIMA;
}
exports.COMISION_MINIMA = 1500;
function calcularComision(subtotal, porcentaje) {
    return Math.max(exports.COMISION_MINIMA, Math.round((subtotal * porcentaje) / 100));
}
exports.SEGUNDOS_PARA_ACEPTAR = 30;
function direccionAproximada(direccion) {
    const m = direccion.trim().match(/^(.*?)\s+(\d+)\b/);
    if (!m)
        return direccion.trim();
    return `${m[1]} al ${Math.floor(Number(m[2]) / 100) * 100}`;
}
function armarOferta(p, ahora, segundos = exports.SEGUNDOS_PARA_ACEPTAR) {
    return {
        pedidoId: p.id,
        numero: p.numero,
        zona: p.zona,
        kioscoNombre: p.kioscoNombre,
        kioscoDireccion: p.kioscoDireccion,
        entregaAproximada: direccionAproximada(p.destino.direccion),
        cantidadProductos: (0, pedido_js_1.cantidadProductos)(p),
        gananciaRider: p.gananciaRider,
        expiraEn: new Date(ahora.getTime() + segundos * 1000),
    };
}
function rangoTiempo(minutos) {
    return `${Math.max(5, minutos - 5)}–${minutos + 5} min`;
}
exports.ESTADOS_ABIERTOS = ['esperando', 'aceptado', 'retirado', 'en-camino'];
function minutosParaLlegar(p, tiempoEstimadoMin, ahora) {
    if (p.estado === 'esperando' || !p.aceptadoEn)
        return null;
    if (p.estado === 'entregado' || p.estado === 'cancelado')
        return 0;
    const llegada = p.aceptadoEn.getTime() + tiempoEstimadoMin * 60_000;
    return Math.max(1, Math.ceil((llegada - ahora.getTime()) / 60_000));
}
//# sourceMappingURL=pedido.rules.js.map