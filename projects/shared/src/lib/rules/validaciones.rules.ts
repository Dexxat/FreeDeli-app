/** Email con forma usuario@dominio.ext. */
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Teléfono argentino: entre 10 y 13 dígitos, ignorando espacios, guiones y "+". */
export function telefonoValido(telefono: string): boolean {
  const digitos = telefono.replace(/[\s\-+()]/g, '');
  return /^\d{10,13}$/.test(digitos);
}

/** Patente de moto argentina: vieja (123ABC) o Mercosur (A123BCD). */
export function patenteValida(patente: string): boolean {
  const p = patente.replace(/\s/g, '').toUpperCase();
  return /^\d{3}[A-Z]{3}$/.test(p) || /^[A-Z]\d{3}[A-Z]{3}$/.test(p);
}

/** CBU/CVU de 22 dígitos, o alias de 6 a 20 caracteres (letras, números, punto y guion). */
export function aliasCbuValido(valor: string): boolean {
  const v = valor.trim();
  return /^\d{22}$/.test(v) || /^[A-Za-z0-9.-]{6,20}$/.test(v);
}
