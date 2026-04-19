// apps/backend/src/clarify/clarify.module.ts
import { Module } from '@nestjs/common';
import { ClarifyController } from './clarify.controller';
import { ClarifyService } from './clarify.service';
import { SessionModule } from '../session/session.module';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [SessionModule, StreamModule],
  controllers: [ClarifyController],
  providers: [ClarifyService],
  exports: [ClarifyService],
})
export class ClarifyModule {}
