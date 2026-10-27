import { CENTRO_ZONA, ZONAS } from '../models/zona.js';
import { AREA_COBERTURA, dentroDelArea, geolocalizarProvisorio } from './cobertura.rules.js';
import { distanciaKm } from './pedido.rules.js';

describe('área de cobertura', () => {
  it('los centros de las tres zonas están dentro', () => {
    for (const z of ZONAS) expect(dentroDelArea(CENTRO_ZONA[z.id])).toBe(true);
  });

  it('deja afuera lo que está lejos', () => {
    expect(dentroDelArea({ lat: -34.525, lng: -58.7 })).toBe(false); // al norte de San Miguel
    expect(dentroDelArea({ lat: -34.555, lng: -58.665 })).toBe(false); // al este de Av. Illia
    expect(dentroDelArea({ lat: -34.58, lng: -58.69 })).toBe(false); // al sur de Gaspar Campos
    expect(dentroDelArea({ lat: -34.551, lng: -58.73 })).toBe(false); // al oeste de Av. España
  });

  it('las esquinas quedan en el borde y el centro adentro', () => {
    expect(dentroDelArea({ lat: -34.5527, lng: -58.697 })).toBe(true);
  });

  it('el área mide unos pocos km de punta a punta', () => {
    const [n, e, s, o] = AREA_COBERTURA;
    expect(distanciaKm(n, s)).toBeLessThan(5);
    expect(distanciaKm(e, o)).toBeLessThan(5);
  });

  it('la geolocalización provisoria reparte las direcciones, no las pega al centro', () => {
    const lejosDelCentro = Array.from({ length: 100 }, (_, i) => geolocalizarProvisorio(`Calle ${i * 37}`, 'san-miguel')).filter(
      (p) => distanciaKm(p, CENTRO_ZONA['san-miguel']) >= 0.2,
    );
    expect(lejosDelCentro.length).toBeGreaterThan(60);
  });

  it('la geolocalización provisoria cae siempre dentro del área', () => {
    for (const z of ZONAS) {
      for (let i = 0; i < 200; i++) expect(dentroDelArea(geolocalizarProvisorio(`Calle ${i * 37}`, z.id))).toBe(true);
    }
  });
});
