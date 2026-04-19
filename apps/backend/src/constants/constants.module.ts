import { Module, Global } from '@nestjs/common';
import { ConstantsService } from './constants.service';

@Global()
@Module({
  providers: [ConstantsService],
  exports: [ConstantsService],
})
export class ConstantsModule {}
