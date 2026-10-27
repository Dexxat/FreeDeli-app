import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin/admin.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { Perfiles } from './comun/perfiles.js';
import { ReglasConfig } from './comun/reglas.config.js';
import { CuentasController } from './cuentas/cuentas.controller.js';
import { CuentasService } from './cuentas/cuentas.service.js';
import { EventosController } from './eventos/eventos.controller.js';
import { EventosModule } from './eventos/eventos.module.js';
import { KioscoController } from './kiosco/kiosco.controller.js';
import { DespachoService } from './pedidos/despacho.service.js';
import { PedidosService } from './pedidos/pedidos.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RiderController } from './rider/rider.controller.js';
import { DocumentosService } from './rider/documentos.service.js';
import { SaludController } from './salud.controller.js';
import { HorarioController } from './horario.controller.js';
import { UsuarioController } from './usuario/usuario.controller.js';
import { WhatsappService } from './avisos/whatsapp.service.js';
import { AvisosRiderService } from './avisos/avisos-rider.service.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, EventosModule, AuthModule],
  controllers: [SaludController, HorarioController, CuentasController, UsuarioController, KioscoController, RiderController, AdminController, EventosController],
  providers: [ReglasConfig, Perfiles, CuentasService, DocumentosService, PedidosService, DespachoService, WhatsappService, AvisosRiderService],
})
export class AppModule {}
