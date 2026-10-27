import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service.js';

function servicio(config: Record<string, string> = {}) {
  return new WhatsappService({ get: (clave: string) => config[clave] } as unknown as ConfigService);
}

describe('WhatsappService', () => {
  const credenciales = { WHATSAPP_TOKEN: 'token-de-prueba', WHATSAPP_NUMERO_ID: '123456' };
  afterEach(() => vi.restoreAllMocks());

  it('manda la plantilla por la Cloud API al celular en formato internacional', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const ok = await servicio(credenciales).enviar('11 5555-0142', 'freedeli_pedido_nuevo', ['Kiosco El Faro', 'San Miguel']);
    expect(ok).toBe(true);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v23.0/123456/messages');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-de-prueba' });
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      to: '5491155550142',
      type: 'template',
      template: {
        name: 'freedeli_pedido_nuevo',
        language: { code: 'es_AR' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Kiosco El Faro' }, { type: 'text', text: 'San Miguel' }] }],
      },
    });
  });

  it('sin credenciales no llama a la API', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect(await servicio().enviar('11 5555-0142', 'freedeli_alta_aprobada', ['Lucas'])).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('con un teléfono que no es celular no manda nada', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect(await servicio(credenciales).enviar('5555', 'freedeli_alta_aprobada', ['Lucas'])).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('si WhatsApp falla, no lanza: el pedido sigue', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sin red'));
    await expect(servicio(credenciales).enviar('11 5555-0142', 'freedeli_pedido_rechazado', ['#A-1'])).resolves.toBe(false);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('plantilla inexistente', { status: 400 }));
    await expect(servicio(credenciales).enviar('11 5555-0142', 'freedeli_pedido_rechazado', ['#A-1'])).resolves.toBe(false);
  });
});
