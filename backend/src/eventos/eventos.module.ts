import { Global, Module } from '@nestjs/common';
import { EventosService } from './eventos.service.js';

@Global()
@Module({ providers: [EventosService], exports: [EventosService] })
export class EventosModule {}
