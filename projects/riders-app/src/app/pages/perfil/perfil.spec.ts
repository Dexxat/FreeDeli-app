import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MockDb, RIDER_ACTUAL_ID, provideFreeDeliMocks } from '@freedeli/shared';
import Perfil from './perfil';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Perfil (Riders)', () => {
  let fixture: ComponentFixture<Perfil>;
  let el: HTMLElement;
  let db: MockDb;

  async function estable() {
    for (let i = 0; i < 3; i++) {
      await esperar();
      await fixture.whenStable();
    }
  }

  const boton = (texto: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === texto)!;
  const rider = () => db.riders().find((r) => r.id === RIDER_ACTUAL_ID)!;

  function escribir(nombre: string, valor: string) {
    const input = el.querySelector<HTMLInputElement>(`input[formcontrolname=${nombre}]`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [provideFreeDeliMocks({ latencia: 0 }), provideRouter([])],
    });
    db = TestBed.inject(MockDb);
    fixture = TestBed.createComponent(Perfil);
    el = fixture.nativeElement;
    await estable();
  });

  it('muestra nombre, antigüedad y datos', () => {
    expect(el.querySelector('h1')?.textContent).toContain('Lucas Romero');
    expect(el.textContent).toContain('Rider desde marzo 2026');
    expect(el.textContent).toContain('A123BCD');
  });

  it('valida y guarda el vehículo y el alias', async () => {
    el.querySelector<HTMLButtonElement>('[aria-label="Editar vehículo y cobros"]')!.click();
    await estable();
    escribir('patente', 'XX');
    boton('GUARDAR').click();
    await estable();
    expect(el.textContent).toContain('Usá el formato');
    expect(rider().vehiculo.patente).toBe('A123BCD');

    escribir('patente', 'b456cde');
    escribir('aliasCbu', 'nuevo.alias');
    boton('GUARDAR').click();
    await estable();
    expect(rider().vehiculo.patente).toBe('B456CDE');
    expect(rider().cobro.aliasCbu).toBe('nuevo.alias');
    expect(el.querySelector('form')).toBeNull();
  });

  it('edita nombre, DNI, teléfono y email', async () => {
    el.querySelector<HTMLButtonElement>('[aria-label="Editar datos personales"]')!.click();
    await estable();
    expect(el.querySelectorAll('form input')).toHaveLength(4);
    escribir('nombre', 'Lucas');
    escribir('dni', '12');
    boton('GUARDAR').click();
    await estable();
    expect(el.textContent).toContain('Ingresá tu nombre y apellido.');
    expect(el.textContent).toContain('Ingresá un DNI de 7 u 8 números.');

    escribir('nombre', 'Lucas Romero Díaz');
    escribir('dni', '38.456.999');
    boton('GUARDAR').click();
    await estable();
    expect(rider()).toMatchObject({ nombre: 'Lucas Romero Díaz', dni: '38456999' });
    expect(el.querySelector('form')).toBeNull();
  });

  it('cambia la preferencia de sonidos', async () => {
    const check = [...el.querySelectorAll<HTMLInputElement>('.preferencias input')][1];
    check.click();
    await estable();
    expect(rider().preferencias.sonidos8bit).toBe(false);
  });

  it('no deja cerrar sesión con un pedido en curso', async () => {
    boton('Cerrar sesión').click();
    await estable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Terminá el pedido en curso');
  });

  it('cierra sesión sin pedido en curso', async () => {
    db.pedidos.update((ps) => ps.map((p) => (p.riderId === RIDER_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'entregado' } : p)));
    await estable();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    boton('Cerrar sesión').click();
    await estable();
    boton('SÍ, SALIR').click();
    await estable();
    expect(navegar).toHaveBeenCalledWith('/sesion-cerrada');
  });
});
