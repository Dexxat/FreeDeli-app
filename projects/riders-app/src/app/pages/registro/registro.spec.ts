import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { API_URL } from '@freedeli/shared';
import Registro from './registro';

describe('Registro (Riders)', () => {
  it('pide las fotos del seguro y la licencia antes de enviar', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), { provide: API_URL, useValue: '/api' }, provideRouter([])] });
    const fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('fd-campo-foto')).toHaveLength(2);
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toBe('Subí la foto del seguro y la de la licencia.');
  });
});
