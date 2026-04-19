// apps/backend/src/stream/stream.controller.ts
import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StreamService } from './stream.service';

@Controller('api/stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Get(':requestId')
  stream(@Param('requestId') requestId: string, @Res() res: Response) {
    this.streamService.register(requestId, res);
  }
}
