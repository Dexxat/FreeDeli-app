import { ConfigService } from '@nestjs/config';
import { CorreoService } from './correo.service.js';

function servicio(config: Record<string, string> = {}) {
  return new CorreoService({ get: (clave: string) => config[clave] } as unknown as ConfigService);
}

describe('CorreoService', () => {
  it('sin SMTP configurado no envía', async () => {
    expect(await servicio().enviar('martina@test.local', 'Asunto', 'Texto')).toBe(false);
  });

  it('si el servidor SMTP no responde, devuelve false sin lanzar el error', async () => {
    const caido = servicio({ SMTP_HOST: '127.0.0.1', SMTP_PUERTO: '1' });
    expect(await caido.enviar('martina@test.local', 'Asunto', 'Texto')).toBe(false);
  });
});
