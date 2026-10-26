"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repartirProbabilidad = repartirProbabilidad;
exports.alternarZona = alternarZona;
exports.pedidosPorRider = pedidosPorRider;
const zona_js_1 = require("../models/zona.js");
function repartirProbabilidad(zonas) {
    const elegidas = zona_js_1.ZONAS.map((z) => z.id).filter((id) => zonas.includes(id));
    const resultado = { 'san-miguel': 0, muniz: 0, 'bella-vista': 0 };
    if (elegidas.length === 0)
        return resultado;
    const base = Math.floor(100 / elegidas.length);
    let resto = 100 - base * elegidas.length;
    for (const id of elegidas) {
        resultado[id] = base + (resto > 0 ? 1 : 0);
        resto--;
    }
    return resultado;
}
function alternarZona(zonas, zona) {
    if (zonas.includes(zona)) {
        return zonas.length > 1 ? zonas.filter((z) => z !== zona) : [...zonas];
    }
    return zona_js_1.ZONAS.map((z) => z.id).filter((id) => id === zona || zonas.includes(id));
}
function pedidosPorRider(d) {
    if (d.ridersActivos === 0)
        return d.pedidosJornada;
    return Math.round((d.pedidosJornada / d.ridersActivos) * 10) / 10;
}
//# sourceMappingURL=zonas.rules.js.map