// apps/backend/src/intake/intake.module.ts
import { Module } from '@nestjs/common';
import { IntakeController } from './intake.controller';
import { IntakeService } from './intake.service';
import { SessionModule } from '../session/session.module';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [SessionModule, StreamModule],
  controllers: [IntakeController],
  providers: [IntakeService],
  exports: [IntakeService],
})
export class IntakeModule {}
