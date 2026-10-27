import { ValidateBy, type ValidationOptions } from 'class-validator';

/**
 * Valida un campo de texto con una regla del dominio compartido, la misma que usan las apps.
 * Así la API y los formularios no pueden divergir.
 */
export function Cumple(regla: (valor: string) => boolean, message: string, opciones?: ValidationOptions): PropertyDecorator {
  return ValidateBy({ name: 'cumple', validator: { validate: (valor: unknown) => typeof valor === 'string' && regla(valor) } }, { message, ...opciones });
}
