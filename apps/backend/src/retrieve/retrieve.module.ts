// apps/backend/src/retrieve/retrieve.module.ts
import { Module } from '@nestjs/common';
import { RetrieveService } from './retrieve.service';

@Module({
  providers: [RetrieveService],
  exports: [RetrieveService],
})
export class RetrieveModule {}
