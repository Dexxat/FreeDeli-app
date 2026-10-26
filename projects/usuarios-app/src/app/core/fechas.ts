const dos = (n: number) => n.toString().padStart(2, '0');

/** "Hoy", "Ayer", "Hace 3 días" o "26/10" si pasó más de una semana. */
export function fechaRelativa(fecha: Date, ahora = new Date()): string {
  const inicio = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicio(ahora) - inicio(fecha)) / 86_400_000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}`;
}
