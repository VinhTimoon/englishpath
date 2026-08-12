import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseFilters,
  UsePipes,
  ValidationPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { AuthenticationGuard, RequiredRoleGuard } from '../auth/auth.guards';
import { RequireAnyRole } from '../auth/auth.decorators';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { CommunityExceptionFilter } from './community.exception.filter';
import { CommunityService } from './community.service';
import {
  CommunityPageDto,
  CreatePostDto,
  DecisionDto,
  ReportPostDto,
  validCommunityIdempotencyKey,
  validCommunityId,
} from './dto/community.dto';
const strict = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
@ApiTags('community')
@ApiBearerAuth()
@Controller('api/v1/community')
@UseGuards(AuthenticationGuard)
@UsePipes(strict)
@UseFilters(CommunityExceptionFilter)
export class CommunityController {
  constructor(private readonly service: CommunityService) {}
  @Post('posts')
  @ApiOperation({ summary: 'Submit a community post for moderation' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(
    @Req() r: AuthenticatedRequest,
    @Body() i: CreatePostDto,
    @Headers('idempotency-key') key?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    if (!validCommunityIdempotencyKey(key))
      throw new UnprocessableEntityException();
    const correlationId = authCorrelationId(correlation);
    return this.service.create(r.principal!, i, key!).then((result) => ({
      data: result.data,
      meta: {
        correlationId,
        idempotencyStatus: result.replayed ? 'replayed' : 'created',
      },
    }));
  }
  @Get('posts')
  @ApiOperation({ summary: 'List published community posts' })
  list(
    @Query() q: CommunityPageDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.service.list(q, authCorrelationId(correlation));
  }
  @Post('posts/:postId/reports')
  @ApiOperation({ summary: 'Report a published community post' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  report(
    @Req() r: AuthenticatedRequest,
    @Param('postId') id: string,
    @Body() i: ReportPostDto,
    @Headers('idempotency-key') key?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    if (!validCommunityId(id)) throw new UnprocessableEntityException();
    if (!validCommunityIdempotencyKey(key))
      throw new UnprocessableEntityException();
    const correlationId = authCorrelationId(correlation);
    return this.service
      .report(r.principal!, id, i, key!, correlationId)
      .then((result) => ({
        data: result.data,
        meta: {
          correlationId,
          idempotencyStatus: result.replayed ? 'replayed' : 'created',
        },
      }));
  }
  @Get('moderation/queue')
  @ApiOperation({ summary: 'List the moderation queue' })
  @UseGuards(RequiredRoleGuard)
  @RequireAnyRole('CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN')
  queue(
    @Query() q: CommunityPageDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.service.queue(q, authCorrelationId(correlation));
  }
  @Post('moderation/:postId/decision')
  @ApiOperation({ summary: 'Apply a moderation decision' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseGuards(RequiredRoleGuard)
  @RequireAnyRole('CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN')
  decide(
    @Req() r: AuthenticatedRequest,
    @Param('postId') id: string,
    @Body() i: DecisionDto,
    @Headers('idempotency-key') key?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    if (!validCommunityId(id)) throw new UnprocessableEntityException();
    if (!validCommunityIdempotencyKey(key))
      throw new UnprocessableEntityException();
    const correlationId = authCorrelationId(correlation);
    return this.service
      .decide(r.principal!, id, i, key!, correlationId)
      .then((x) => ({
        data: x.data,
        meta: {
          correlationId,
          idempotencyStatus: x.replayed ? 'replayed' : 'created',
        },
      }));
  }
}
