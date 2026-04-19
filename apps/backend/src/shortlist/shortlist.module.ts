// apps/backend/src/shortlist/shortlist.module.ts
import { Module } from '@nestjs/common';
import { ShortlistController } from './shortlist.controller';
import { CompareService } from './compare.service';
import { RetrieveModule } from '../retrieve/retrieve.module';
import { RankModule } from '../rank/rank.module';
import { SessionModule } from '../session/session.module';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [RetrieveModule, RankModule, SessionModule, StreamModule],
  controllers: [ShortlistController],
  providers: [CompareService],
})
export class ShortlistModule {}
