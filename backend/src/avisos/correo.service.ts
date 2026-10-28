import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Envía mails por SMTP (cualquier proveedor: SMTP_HOST, SMTP_PUERTO, SMTP_USUARIO, SMTP_CLAVE y SMTP_DESDE).
 * Sin SMTP_HOST no envía: deja el mail en el log (desarrollo y tests).
 * Nunca lanza errores: devuelve si se pudo enviar.
 */
@Injectable()
export class CorreoService {
  private readonly log = new Logger(CorreoService.name);
  private transporte?: Transporter;

  constructor(private readonly config: ConfigService) {}

  private conectar(): Transporter | null {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return null;
    const puerto = Number(this.config.get('SMTP_PUERTO') ?? 587);
    this.transporte ??= createTransport({
      host,
      port: puerto,
      // 465 usa TLS desde el inicio; 587 lo negocia con STARTTLS.
      secure: puerto === 465,
      auth: { user: this.config.get<string>('SMTP_USUARIO'), pass: this.config.get<string>('SMTP_CLAVE') },
    });
    return this.transporte;
  }

  async enviar(para: string, asunto: string, texto: string): Promise<boolean> {
    const transporte = this.conectar();
    if (!transporte) {
      this.log.log(`[sin SMTP configurado] ${asunto} → ${para}\n${texto}`);
      return false;
    }
    try {
      await transporte.sendMail({ from: this.config.get<string>('SMTP_DESDE') ?? 'FreeDeli <no-responder@freedeli.com.ar>', to: para, subject: asunto, text: texto });
      return true;
    } catch (e) {
      this.log.error(`No se pudo enviar "${asunto}" a ${para}: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}
