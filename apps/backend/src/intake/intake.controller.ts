// apps/backend/src/intake/intake.controller.ts
import { Body, Controller, Post, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GraphService } from '../graph/graph.service';
import { SessionService } from '../session/session.service';
import { StreamService } from '../stream/stream.service';
import { IntakeRequestSchema } from '../common/schemas';
import { ZodPipe } from '../common/zod.pipe';
import { ConstantsService } from '../constants/constants.service';
import type { IntakeRequestDto, IntakeResponse } from '../common/dto';

@Controller('api/intake')
export class IntakeController {
  private readonly logger = new Logger(IntakeController.name);

  constructor(
    private readonly graphService: GraphService,
    private readonly sessionService: SessionService,
    private readonly streamService: StreamService,
    private readonly constants: ConstantsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async intake(@Body(new ZodPipe(IntakeRequestSchema)) body: IntakeRequestDto): Promise<IntakeResponse> {
    const t0 = Date.now();
    this.logger.log(`POST /api/intake — ${body.text.length} chars: "${body.text.substring(0, 60)}…"`);

    const dummyParsed: any = {};
    const session = this.sessionService.create(body.text, dummyParsed);
    this.logger.log(`Session created: ${session.id}`);

    const state = await this.graphService.runIntake(session.id, body.text);

    const p = state.parsedData;
    this.logger.log(
      `Intake graph done (${Date.now() - t0}ms) — budget=${p?.budget}L city=${p?.city} ` +
      `family=${p?.familySize} driving=${p?.cityVsHighway} priorities=[${p?.priorities?.join(',')}]`
    );

    this.streamService.emit(session.id, 'status', {
      stage: this.constants.STAGE_PARSED,
      message: this.constants.MSG_PARSED,
    });

    return {
      success: true,
      message: this.constants.SUCCESS_MSG_INTAKE,
      data: { requestId: session.id, parsed: state.parsedData, step: 'clarify' },
    };
  }
}
