/**
 * FreeDeli es un servicio nocturno: se pueden hacer pedidos de 00:00 a 08:00,
 * hora de Argentina, sin importar el reloj o la zona horaria del dispositivo.
 */
export const HORARIO_SERVICIO = { desde: 0, hasta: 8 } as const;

const HORA_AR = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hourCycle: 'h23' });

/** Hora (0–23) en Argentina para un instante. */
export function horaArgentina(ahora: Date): number {
  return Number(HORA_AR.format(ahora));
}

/** true si en ese instante se pueden hacer pedidos. */
export function servicioAbierto(ahora: Date, horario: { desde: number; hasta: number } = HORARIO_SERVICIO): boolean {
  const h = horaArgentina(ahora);
  return horario.desde <= horario.hasta ? h >= horario.desde && h < horario.hasta : h >= horario.desde || h < horario.hasta;
}

/** "00 a 08 hs" */
export function textoHorario(horario: { desde: number; hasta: number } = HORARIO_SERVICIO): string {
  const dos = (n: number) => n.toString().padStart(2, '0');
  return `${dos(horario.desde)} a ${dos(horario.hasta)} hs`;
}
