import { aliasCbuValido, dniValido, emailValido, nombreCompletoValido, nombreCorto, normalizarDni, patenteValida, primerNombre, telefonoValido, whatsappArgentina } from './validaciones.rules.js';

describe('validaciones', () => {
  it('email', () => {
    expect(emailValido('lucas@example.com')).toBe(true);
    expect(emailValido('lucas@example')).toBe(false);
    expect(emailValido('lucas example.com')).toBe(false);
  });
  it('teléfono', () => {
    expect(telefonoValido('+54 9 11 5555-0142')).toBe(true);
    expect(telefonoValido('11 5555-0101')).toBe(true);
    expect(telefonoValido('5555')).toBe(false);
  });
  it('patente de moto', () => {
    expect(patenteValida('A123BCD')).toBe(true);
    expect(patenteValida('123 abc')).toBe(true);
    expect(patenteValida('AB123CD')).toBe(false);
  });
  it('alias o CBU', () => {
    expect(aliasCbuValido('lucas.rider.fd')).toBe(true);
    expect(aliasCbuValido('0'.repeat(22))).toBe(true);
    expect(aliasCbuValido('abc')).toBe(false);
    expect(aliasCbuValido('alias con espacios')).toBe(false);
  });
});

describe('datos personales', () => {
  it('valida el DNI con o sin puntos', () => {
    expect(dniValido('40.111.222')).toBe(true);
    expect(dniValido('8111222')).toBe(true);
    expect(dniValido('123456')).toBe(false);
    expect(dniValido('40111222a')).toBe(false);
    expect(normalizarDni('40.111.222')).toBe('40111222');
  });

  it('pide nombre y apellido', () => {
    expect(nombreCompletoValido('Martina Rodríguez')).toBe(true);
    expect(nombreCompletoValido('  Ana María  López ')).toBe(true);
    expect(nombreCompletoValido('Martina')).toBe(false);
    expect(nombreCompletoValido('Martina R')).toBe(false);
  });

  it('arma el saludo y el nombre corto', () => {
    expect(primerNombre('Martina Rodríguez')).toBe('Martina');
    expect(nombreCorto('Martina Rodríguez')).toBe('Martina R.');
    expect(nombreCorto('martina rodríguez')).toBe('martina R.');
    expect(nombreCorto('Martina')).toBe('Martina');
  });
});

describe('whatsappArgentina', () => {
  it('lleva los celulares al formato de WhatsApp', () => {
    expect(whatsappArgentina('11 5555-0142')).toBe('5491155550142');
    expect(whatsappArgentina('+54 9 11 5555-0142')).toBe('5491155550142');
    expect(whatsappArgentina('011 15 5555-0142')).toBe('5491155550142');
    expect(whatsappArgentina('(0221) 15 455-1234')).toBe('5492214551234');
    expect(whatsappArgentina('54 11 5555 0142')).toBe('5491155550142');
  });

  it('rechaza lo que no es un celular con código de área', () => {
    expect(whatsappArgentina('5555-0142')).toBeNull();
    expect(whatsappArgentina('11 5555-01420')).toBeNull();
    expect(whatsappArgentina('')).toBeNull();
  });
});
