"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CENTRO_ZONA = exports.ZONAS = void 0;
exports.nombreZona = nombreZona;
exports.ZONAS = [
    { id: 'san-miguel', nombre: 'San Miguel' },
    { id: 'muniz', nombre: 'Muñiz' },
    { id: 'bella-vista', nombre: 'Bella Vista' },
];
exports.CENTRO_ZONA = {
    'san-miguel': { lat: -34.5433, lng: -58.7117 },
    muniz: { lat: -34.5486, lng: -58.6997 },
    'bella-vista': { lat: -34.5626, lng: -58.6895 },
};
function nombreZona(id) {
    return exports.ZONAS.find((z) => z.id === id)?.nombre ?? id;
}
//# sourceMappingURL=zona.js.map