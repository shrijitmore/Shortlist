// apps/backend/src/shortlist/shortlist.controller.ts
import { Body, Controller, Post, HttpCode, HttpStatus, NotFoundException, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GraphService } from '../graph/graph.service';
import { CompareService } from './compare.service';
import { SessionService } from '../session/session.service';
import { StreamService } from '../stream/stream.service';
import { ShortlistRequestSchema, CompareRequestSchema } from '../common/schemas';
import { ZodPipe } from '../common/zod.pipe';
import { ConstantsService } from '../constants/constants.service';
import type { ShortlistRequestDto, CompareRequestDto, ShortlistResponse, CompareResponse } from '../common/dto';
import type { ShortlistResult } from '../common/types';

@Controller('api/shortlist')
export class ShortlistController {
  private readonly logger = new Logger(ShortlistController.name);

  constructor(
    private readonly graphService: GraphService,
    private readonly compareService: CompareService,
    private readonly sessionService: SessionService,
    private readonly streamService: StreamService,
    private readonly constants: ConstantsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async shortlist(@Body(new ZodPipe(ShortlistRequestSchema)) body: ShortlistRequestDto): Promise<ShortlistResponse> {
    const t0 = Date.now();
    this.logger.log(`POST /api/shortlist — session ${body.requestId} answer="${body.answer.substring(0, 60)}…"`);

    const session = this.sessionService.findById(body.requestId);
    if (!session) throw new NotFoundException(this.constants.ERR_SESSION_NOT_FOUND);
    if (!session.parsed_data) throw new NotFoundException(this.constants.ERR_PARSED_DATA_MISSING_SHORTLIST);

    this.sessionService.saveAnswer(body.requestId, body.answer);

    const state = await this.graphService.runShortlist(body.requestId, body.answer);

    if (!state.clarificationDone) {
      this.logger.log(
        `More clarification needed — Q${state.questionCount} dim=${state.clarifyQuestion?.dimension} (${Date.now() - t0}ms)`
      );
      return {
        success: true,
        message: this.constants.MSG_MORE_CLARIFICATION,
        data: {
          needsMoreClarification: true,
          nextQuestion: {
            question: state.clarifyQuestion.question,
            options: state.clarifyQuestion.options,
            dimension: state.clarifyQuestion.dimension,
            questionNumber: state.questionCount,
          },
          shortlist: null,
        },
      };
    }

    if (state.shortlist) {
      this.sessionService.saveShortlist(body.requestId, state.shortlist);
    }
    this.streamService.close(body.requestId);

    const top = state.shortlist?.topPick?.car;
    this.logger.log(
      `Shortlist complete (${Date.now() - t0}ms) — top=${top?.brand} ${top?.model} ₹${top?.price_min_lakh}-${top?.price_max_lakh}L`
    );

    return {
      success: true,
      message: this.constants.SUCCESS_MSG_SHORTLIST,
      data: { needsMoreClarification: false, nextQuestion: null, shortlist: state.shortlist },
    };
  }

  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async compare(@Body(new ZodPipe(CompareRequestSchema)) body: CompareRequestDto): Promise<CompareResponse> {
    const t0 = Date.now();
    this.logger.log(`POST /api/shortlist/compare — session ${body.requestId}`);

    const session = this.sessionService.findById(body.requestId);
    if (!session) throw new NotFoundException(this.constants.ERR_SESSION_NOT_FOUND);
    if (!session.shortlist) throw new NotFoundException(this.constants.ERR_SHORTLIST_MISSING);

    const shortlist: ShortlistResult = session.shortlist as ShortlistResult;
    const verdict = await this.compareService.compare(shortlist, session.raw_input);

    this.logger.log(`Compare verdict ready (${Date.now() - t0}ms) — ${verdict.length} chars`);

    return {
      success: true,
      message: this.constants.SUCCESS_MSG_COMPARE,
      data: { verdict },
    };
  }
}
