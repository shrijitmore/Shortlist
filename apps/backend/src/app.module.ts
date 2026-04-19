import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConstantsModule } from './constants/constants.module';
import { AiModule } from './ai/ai.module';
import { DatabaseModule } from './database/database.module';
import { GraphModule } from './graph/graph.module';
import { IntakeModule } from './intake/intake.module';
import { ClarifyModule } from './clarify/clarify.module';
import { ShortlistModule } from './shortlist/shortlist.module';
import { StreamModule } from './stream/stream.module';
import { SessionModule } from './session/session.module';
import { AppThrottlerGuard } from './common/throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ConstantsModule,
    AiModule,
    DatabaseModule,
    GraphModule,
    SessionModule,
    StreamModule,
    IntakeModule,
    ClarifyModule,
    ShortlistModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
