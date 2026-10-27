import { TestBed } from '@angular/core/testing';
import { Rush } from './rush';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Rush', () => {
  async function crear(estrellaDisponible = true) {
    const fixture = TestBed.createComponent(Rush);
    fixture.componentRef.setInput('estrellaDisponible', estrellaDisponible);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('empieza con SALTAR y la escena se mueve', async () => {
    const { fixture, el } = await crear();
    expect(el.querySelector('.mensaje')?.textContent).toContain('Tocá SALTAR para empezar');
    el.querySelector<HTMLButtonElement>('button.saltar')!.click();
    await esperar(120);
    await fixture.whenStable();
    expect(el.querySelector('.mensaje')).toBeNull();
    expect(el.querySelector<HTMLElement>('.moto')!.style.bottom).not.toBe('30px');
  });

  it('muestra la racha hacia la estrella solo si todavía la puede ganar', async () => {
    expect((await crear(true)).el.querySelector('.racha')?.textContent).toContain('Jugá 10 minutos seguidos');
    TestBed.resetTestingModule();
    expect((await crear(false)).el.querySelector('.racha')).toBeNull();
  });
});
