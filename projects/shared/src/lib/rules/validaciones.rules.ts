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
  const p = normalizarPatente(patente);
  return /^\d{3}[A-Z]{3}$/.test(p) || /^[A-Z]\d{3}[A-Z]{3}$/.test(p);
}

/** CBU/CVU de 22 dígitos, o alias de 6 a 20 caracteres (letras, números, punto y guion). */
export function aliasCbuValido(valor: string): boolean {
  const v = valor.trim();
  return /^\d{22}$/.test(v) || /^[A-Za-z0-9.-]{6,20}$/.test(v);
}

/** DNI argentino: 7 u 8 dígitos, con o sin puntos. */
export function dniValido(dni: string): boolean {
  return /^\d{7,8}$/.test(dni.replace(/[.\s]/g, ''));
}

/** "40.111.222" → "40111222". */
export function normalizarDni(dni: string): string {
  return dni.replace(/[.\s]/g, '');
}

/** Nombre y apellido: al menos dos palabras de dos letras o más. */
export function nombreCompletoValido(nombre: string): boolean {
  const palabras = nombre.trim().split(/\s+/);
  return palabras.length >= 2 && palabras.every((p) => p.length >= 2) && nombre.trim().length <= 60;
}

/** "Martina Rodríguez" → "Martina": para el saludo. */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? '';
}

/** "Martina Rodríguez" → "Martina R.": lo que ve el rider del cliente. */
export function nombreCorto(nombre: string): string {
  const [primero, apellido] = nombre.trim().split(/\s+/);
  return apellido ? `${primero} ${apellido[0].toUpperCase()}.` : (primero ?? '');
}

/** "a 123 bcd" → "A123BCD". */
export function normalizarPatente(patente: string): string {
  return patente.replace(/\s/g, '').toUpperCase();
}
