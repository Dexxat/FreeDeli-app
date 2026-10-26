import { aliasCbuValido, emailValido, patenteValida, telefonoValido } from './validaciones.rules';

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
