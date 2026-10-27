import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockDb, USUARIO_ACTUAL_ID, provideFreeDeliMocks } from '@freedeli/shared';
import Ajustes from './ajustes';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Ajustes (Usuarios)', () => {
  async function abrir() {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0 }), provideRouter([])] });
    const fixture = TestBed.createComponent(Ajustes);
    for (let i = 0; i < 3; i++) {
      await esperar();
      await fixture.whenStable();
    }
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }
  const campo = (el: HTMLElement, nombre: string) => el.querySelector<HTMLInputElement>(`input[formcontrolname=${nombre}]`)!;
  const escribir = (input: HTMLInputElement, valor: string) => {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  };

  it('muestra los datos actuales y guarda los cambios', async () => {
    const { fixture, el } = await abrir();
    expect(campo(el, 'nombre').value).toBe('Martina Rodríguez');
    expect(campo(el, 'dni').value).toBe('40111222');
    escribir(campo(el, 'nombre'), 'Martina Gómez');
    escribir(campo(el, 'telefono'), '11 4444-0000');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await esperar();
    await fixture.whenStable();
    expect(el.textContent).toContain('Datos guardados.');
    const u = TestBed.inject(MockDb).usuarios().find((x) => x.id === USUARIO_ACTUAL_ID)!;
    expect(u).toMatchObject({ nombre: 'Martina Gómez', telefono: '11 4444-0000' });
  });

  it('no guarda datos inválidos y dice qué corregir', async () => {
    const { fixture, el } = await abrir();
    escribir(campo(el, 'nombre'), 'Martina');
    escribir(campo(el, 'dni'), '123');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(el.textContent).toContain('Ingresá tu nombre y apellido.');
    expect(el.textContent).toContain('Ingresá un DNI de 7 u 8 números.');
    expect(TestBed.inject(MockDb).usuarios().find((x) => x.id === USUARIO_ACTUAL_ID)!.nombre).toBe('Martina Rodríguez');
  });
});
