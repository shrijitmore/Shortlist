// apps/backend/src/clarify/clarify.controller.ts
import { Body, Controller, Post, HttpCode, HttpStatus, NotFoundException, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GraphService } from '../graph/graph.service';
import { SessionService } from '../session/session.service';
import { StreamService } from '../stream/stream.service';
import { ClarifyRequestSchema } from '../common/schemas';
import { ZodPipe } from '../common/zod.pipe';
import { ConstantsService } from '../constants/constants.service';
import type { ClarifyRequestDto, ClarifyResponse } from '../common/dto';

@Controller('api/clarify')
export class ClarifyController {
  private readonly logger = new Logger(ClarifyController.name);

  constructor(
    private readonly graphService: GraphService,
    private readonly sessionService: SessionService,
    private readonly streamService: StreamService,
    private readonly constants: ConstantsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async clarify(@Body(new ZodPipe(ClarifyRequestSchema)) body: ClarifyRequestDto): Promise<ClarifyResponse> {
    this.logger.log(`POST /api/clarify — session ${body.requestId}`);

    const session = this.sessionService.findById(body.requestId);
    if (!session) throw new NotFoundException(this.constants.ERR_SESSION_NOT_FOUND);
    if (!session.parsed_data) throw new NotFoundException(this.constants.ERR_PARSED_DATA_MISSING);

    const state = await this.graphService.getSession(body.requestId);
    if (!state.clarifyQuestion) throw new NotFoundException(this.constants.ERR_CLARIFY_NOT_READY);

    const { question, options, dimension } = state.clarifyQuestion;
    this.sessionService.saveClarifier(body.requestId, question, options);

    this.logger.log(`Clarify Q ready — dimension=${dimension} options=${options.length}`);

    this.streamService.emit(body.requestId, 'status', {
      stage: this.constants.STAGE_CLARIFYING,
      message: this.constants.MSG_CLARIFYING,
    });

    return {
      success: true,
      message: this.constants.SUCCESS_MSG_CLARIFY,
      data: { question, options, dimension },
    };
  }
}
