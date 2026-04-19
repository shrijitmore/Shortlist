// apps/backend/src/common/throttler.guard.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      { success: false, message: 'Too many requests — please slow down and try again shortly.', data: null },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
