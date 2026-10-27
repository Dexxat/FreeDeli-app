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

/**
 * Celular argentino en el formato de WhatsApp (549 + área + número, 13 dígitos).
 * Acepta cómo lo escribe la gente: "11 5555-0142", "+54 9 11 5555-0142", "011 15 5555-0142".
 * null si no se puede interpretar como un celular con código de área.
 */
export function whatsappArgentina(telefono: string): string | null {
  let d = telefono.replace(/\D/g, '');
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  // El "15" de los celulares va después del código de área (de 2 a 4 dígitos): se saca.
  if (d.length === 12) {
    const area = [2, 3, 4].find((n) => d.slice(n, n + 2) === '15');
    if (area === undefined) return null;
    d = d.slice(0, area) + d.slice(area + 2);
  }
  return /^[1-9]\d{9}$/.test(d) ? `549${d}` : null;
}

/** Celular argentino al que se le puede escribir por WhatsApp (los riders reciben los avisos así). */
export function celularValido(telefono: string): boolean {
  return whatsappArgentina(telefono) !== null;
}
