import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { whatsappArgentina } from '../dominio.js';

/**
 * Envía mensajes de plantilla por la API oficial de WhatsApp (Cloud API de Meta).
 * Sin WHATSAPP_TOKEN y WHATSAPP_NUMERO_ID no envía: solo deja el mensaje en el log (desarrollo y tests).
 * Nunca lanza errores: un aviso que falla no puede frenar un pedido.
 */
@Injectable()
export class WhatsappService {
  private readonly log = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  private get credenciales(): { token: string; numeroId: string; version: string } | null {
    const token = this.config.get<string>('WHATSAPP_TOKEN');
    const numeroId = this.config.get<string>('WHATSAPP_NUMERO_ID');
    return token && numeroId ? { token, numeroId, version: this.config.get<string>('WHATSAPP_VERSION') ?? 'v23.0' } : null;
  }

  /** Manda la plantilla aprobada `plantilla` con sus parámetros, en orden ({{1}}, {{2}}, ...). */
  async enviar(telefono: string, plantilla: string, parametros: string[]): Promise<boolean> {
    const destino = whatsappArgentina(telefono);
    if (!destino) {
      this.log.warn(`No se envió "${plantilla}": el teléfono "${telefono}" no es un celular válido.`);
      return false;
    }
    const credenciales = this.credenciales;
    if (!credenciales) {
      this.log.log(`[sin WhatsApp configurado] ${plantilla} → ${destino}: ${parametros.join(' | ')}`);
      return false;
    }
    try {
      const respuesta = await fetch(`https://graph.facebook.com/${credenciales.version}/${credenciales.numeroId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${credenciales.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: destino,
          type: 'template',
          template: {
            name: plantilla,
            language: { code: 'es_AR' },
            components: [{ type: 'body', parameters: parametros.map((text) => ({ type: 'text', text })) }],
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!respuesta.ok) {
        this.log.error(`WhatsApp rechazó "${plantilla}" (${respuesta.status}): ${await respuesta.text()}`);
        return false;
      }
      return true;
    } catch (e) {
      this.log.error(`No se pudo enviar "${plantilla}" por WhatsApp: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}
