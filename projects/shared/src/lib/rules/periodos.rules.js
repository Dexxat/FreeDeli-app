"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rangoPeriodo = rangoPeriodo;
exports.enRango = enRango;
exports.inicioDelDia = inicioDelDia;
exports.sumarDias = sumarDias;
function inicioDelDia(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sumarDias(d, dias) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias);
}
function rangoPeriodo(periodo, ahora) {
    const hoy = inicioDelDia(ahora);
    const manana = sumarDias(hoy, 1);
    switch (periodo) {
        case 'hoy':
        case 'jornada':
            return { desde: hoy, hasta: manana };
        case 'semana':
            return { desde: sumarDias(hoy, -6), hasta: manana };
        case 'mes':
            return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: manana };
        case 'mes-pasado':
            return {
                desde: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
                hasta: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
            };
    }
}
function enRango(fecha, r) {
    return fecha >= r.desde && fecha < r.hasta;
}
//# sourceMappingURL=periodos.rules.js.map