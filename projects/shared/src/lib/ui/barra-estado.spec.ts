import { TestBed } from '@angular/core/testing';
import { BarraEstado } from './barra-estado';

describe('BarraEstado', () => {
  async function render(estado: string) {
    const fixture = TestBed.createComponent(BarraEstado);
    fixture.componentRef.setInput('estado', estado);
    await fixture.whenStable();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')];
  }

  it('marca completados, actual y pendientes', async () => {
    const lis = await render('en-camino');
    expect(lis.map((li) => li.className)).toEqual(['completado', 'completado', 'actual', 'pendiente']);
    expect(lis[2].getAttribute('aria-current')).toBe('step');
  });

  it('esperando rider: todo pendiente', async () => {
    const lis = await render('esperando');
    expect(lis.every((li) => li.className === 'pendiente')).toBe(true);
  });
});
