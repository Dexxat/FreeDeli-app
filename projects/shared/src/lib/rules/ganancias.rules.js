"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumirGanancias = resumirGanancias;
const periodos_rules_js_1 = require("./periodos.rules.js");
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function resumirGanancias(pedidos, periodo, ahora, horasOnline) {
    const rango = (0, periodos_rules_js_1.rangoPeriodo)(periodo, ahora);
    const entregados = pedidos.filter((p) => p.estado === 'entregado' && (0, periodos_rules_js_1.enRango)(p.creadoEn, rango));
    const envios = entregados.reduce((a, p) => a + p.gananciaRider, 0);
    const propinas = entregados.reduce((a, p) => a + p.propina, 0);
    const total = envios + propinas;
    const cantidadPedidos = entregados.length;
    return {
        periodo,
        envios,
        propinas,
        total,
        cantidadPedidos,
        promedioPorPedido: cantidadPedidos ? Math.round(total / cantidadPedidos) : 0,
        horasOnline,
        barras: armarBarras(entregados, periodo, rango.desde, rango.hasta),
    };
}
function ganancia(p) {
    return p.gananciaRider + p.propina;
}
function armarBarras(entregados, periodo, desde, hasta) {
    if (periodo === 'jornada') {
        const barras = Array.from({ length: 24 }, (_, h) => ({ etiqueta: h.toString().padStart(2, '0'), monto: 0 }));
        for (const p of entregados)
            barras[p.creadoEn.getHours()].monto += ganancia(p);
        return barras;
    }
    if (periodo === 'semana') {
        const barras = [];
        for (let d = desde; d < hasta; d = (0, periodos_rules_js_1.sumarDias)(d, 1)) {
            const dia = d;
            const monto = entregados
                .filter((p) => (0, periodos_rules_js_1.inicioDelDia)(p.creadoEn).getTime() === dia.getTime())
                .reduce((a, p) => a + ganancia(p), 0);
            barras.push({ etiqueta: DIAS[dia.getDay()], monto });
        }
        return barras;
    }
    const barras = [];
    for (let d = desde, n = 1; d < hasta; d = (0, periodos_rules_js_1.sumarDias)(d, 7), n++) {
        const fin = (0, periodos_rules_js_1.sumarDias)(d, 7) < hasta ? (0, periodos_rules_js_1.sumarDias)(d, 7) : hasta;
        const inicio = d;
        const monto = entregados
            .filter((p) => p.creadoEn >= inicio && p.creadoEn < fin)
            .reduce((a, p) => a + ganancia(p), 0);
        barras.push({ etiqueta: `S${n}`, monto });
    }
    return barras;
}
//# sourceMappingURL=ganancias.rules.js.map