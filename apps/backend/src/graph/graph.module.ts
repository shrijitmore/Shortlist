import { Module, Global } from '@nestjs/common';
import { GraphService } from './graph.service';
import { IntakeModule } from '../intake/intake.module';
import { ClarifyModule } from '../clarify/clarify.module';
import { RetrieveModule } from '../retrieve/retrieve.module';
import { RankModule } from '../rank/rank.module';
import { StreamModule } from '../stream/stream.module';
import { ConstantsModule } from '../constants/constants.module';

@Global()
@Module({
  imports: [IntakeModule, ClarifyModule, RetrieveModule, RankModule, StreamModule, ConstantsModule],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}
