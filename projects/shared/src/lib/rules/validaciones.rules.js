"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailValido = emailValido;
exports.telefonoValido = telefonoValido;
exports.patenteValida = patenteValida;
exports.aliasCbuValido = aliasCbuValido;
function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
function telefonoValido(telefono) {
    const digitos = telefono.replace(/[\s\-+()]/g, '');
    return /^\d{10,13}$/.test(digitos);
}
function patenteValida(patente) {
    const p = patente.replace(/\s/g, '').toUpperCase();
    return /^\d{3}[A-Z]{3}$/.test(p) || /^[A-Z]\d{3}[A-Z]{3}$/.test(p);
}
function aliasCbuValido(valor) {
    const v = valor.trim();
    return /^\d{22}$/.test(v) || /^[A-Za-z0-9.-]{6,20}$/.test(v);
}
//# sourceMappingURL=validaciones.rules.js.map