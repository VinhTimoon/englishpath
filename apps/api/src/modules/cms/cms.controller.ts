import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { AuthenticationGuard } from '../auth/auth.guards';
import { CmsExceptionFilter } from './cms-exception.filter';
import { CmsService } from './cms.service';
import {
  CreateContentVersionDto,
  CreateTaxonomyNodeDto,
  CmsTaxonomyQueryDto,
  PublishContentVersionDto,
  ReviewContentVersionDto,
} from './dto/cms.dto';

const strictValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('cms')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Correlation-Id',
  required: false,
  description: 'Validated correlation ID; generated when omitted.',
})
@Controller('api/v1/cms')
@UseGuards(AuthenticationGuard)
@UseFilters(CmsExceptionFilter)
@UsePipes(strictValidation)
export class CmsController {
  constructor(private readonly service: CmsService) {}

  @Get('taxonomy/nodes')
  @ApiOperation({ summary: 'List role-scoped CMS taxonomy nodes' })
  @ApiOkResponse({ description: 'Bounded taxonomy page' })
  listTaxonomy(
    @Req() request: AuthenticatedRequest,
    @Query() query: CmsTaxonomyQueryDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.service
      .listTaxonomy(request.principal!, query, correlationId)
      .then((data) => ({
        ...data,
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      }));
  }

  @Post('taxonomy/nodes')
  @ApiOperation({ summary: 'Create a governed CMS taxonomy node' })
  @ApiBody({ type: CreateTaxonomyNodeDto })
  createTaxonomy(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateTaxonomyNodeDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.service
      .createTaxonomy(request.principal!, input, correlationId)
      .then((data) => ({
        data,
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      }));
  }

  @Get('content-versions/:id')
  @ApiOperation({ summary: 'Read a role-scoped CMS content version' })
  @ApiOkResponse({
    description:
      'Governed content version without private source URL or rights owner',
  })
  getVersion(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.service
      .getVersion(request.principal!, id, correlationId)
      .then((data) => ({
        data,
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      }));
  }

  @Post('content-versions')
  @ApiOperation({ summary: 'Create an immutable CMS draft version' })
  @ApiBody({ type: CreateContentVersionDto })
  createVersion(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateContentVersionDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.service
      .createVersion(request.principal!, input, correlationId)
      .then((result) => ({
        data: result.data,
        meta: { correlationId, idempotencyStatus: result.idempotencyStatus },
      }));
  }

  @Post('content-versions/:id/review')
  @ApiOperation({ summary: 'Record an action-bound human content review' })
  @ApiBody({ type: ReviewContentVersionDto })
  reviewVersion(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: ReviewContentVersionDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.service
      .reviewVersion(request.principal!, id, input, correlationId)
      .then((data) => ({
        data,
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      }));
  }

  @Post('content-versions/:id/publish')
  @ApiOperation({ summary: 'Publish reviewed content when rights permit' })
  @ApiBody({ type: PublishContentVersionDto })
  publishVersion(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: PublishContentVersionDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.service
      .publishVersion(request.principal!, id, input, correlationId)
      .then((data) => ({
        data,
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      }));
  }
}
