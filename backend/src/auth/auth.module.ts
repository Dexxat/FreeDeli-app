import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CorreoService } from '../avisos/correo.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET'), signOptions: { expiresIn: '30d' } }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CorreoService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
