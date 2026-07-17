import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth-request';
import {
  authCorrelationId,
  AuthExceptionFilter,
} from '../auth/auth-exception.filter';
import { AuthenticationGuard } from '../auth/auth.guards';
import { SubmitOnboardingDto } from './dto/submit-onboarding.dto';
import { SubmitPlacementDto } from './dto/submit-placement.dto';
import { OnboardingService } from './onboarding.service';

const validation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('learner-entry')
@ApiBearerAuth()
@Controller('api/v1')
@UseFilters(AuthExceptionFilter)
@UseGuards(AuthenticationGuard)
@UsePipes(validation)
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('onboarding')
  @ApiOperation({ summary: 'Read the current learner onboarding state' })
  getOnboarding(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.getOnboarding(request.principal!),
      correlation,
    );
  }

  @Patch('onboarding')
  @ApiOperation({ summary: 'Complete or update learner onboarding' })
  @ApiOkResponse({ description: 'Persisted owner onboarding state' })
  submitOnboarding(
    @Req() request: AuthenticatedRequest,
    @Body() input: SubmitOnboardingDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.submitOnboarding(request.principal!, input),
      correlation,
    );
  }

  @Get('placement/questions')
  @ApiOperation({ summary: 'Read placement questions without answer keys' })
  getQuestions(@Headers('x-correlation-id') correlation?: string) {
    return this.wrap(Promise.resolve(this.service.getQuestions()), correlation);
  }

  @Post('placement/submissions')
  @ApiOperation({ summary: 'Submit and score one placement attempt' })
  submitPlacement(
    @Req() request: AuthenticatedRequest,
    @Body() input: SubmitPlacementDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.submitPlacement(
        request.principal!,
        input.clientSubmissionId,
        input.answers,
      ),
      correlation,
    );
  }

  @Get('placement/result')
  @ApiOperation({ summary: 'Read the latest placement result' })
  getResult(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.getLatestResult(request.principal!),
      correlation,
    );
  }

  private async wrap<T>(data: Promise<T>, correlation?: string) {
    return {
      data: await data,
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    };
  }
}
