import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin/admin.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { Perfiles } from './comun/perfiles.js';
import { ReglasConfig } from './comun/reglas.config.js';
import { CuentasController } from './cuentas/cuentas.controller.js';
import { EventosController } from './eventos/eventos.controller.js';
import { EventosService } from './eventos/eventos.service.js';
import { KioscoController } from './kiosco/kiosco.controller.js';
import { DespachoService } from './pedidos/despacho.service.js';
import { PedidosService } from './pedidos/pedidos.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RiderController } from './rider/rider.controller.js';
import { UsuarioController } from './usuario/usuario.controller.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [CuentasController, UsuarioController, KioscoController, RiderController, AdminController, EventosController],
  providers: [ReglasConfig, Perfiles, EventosService, PedidosService, DespachoService],
})
export class AppModule {}
