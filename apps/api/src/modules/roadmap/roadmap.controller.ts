import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { AuthenticationGuard } from '../auth/auth.guards';
import { UpdateRoadmapItemDto } from './dto/update-roadmap-item.dto';
import { RoadmapExceptionFilter } from './roadmap-exception.filter';
import { RoadmapService } from './roadmap.service';

@ApiTags('roadmaps')
@ApiBearerAuth()
@Controller('api/v1/roadmaps')
@UseFilters(RoadmapExceptionFilter)
@UseGuards(AuthenticationGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class RoadmapController {
  constructor(private readonly service: RoadmapService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate or replay the active learner roadmap' })
  generate(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(this.service.generate(request.principal!), correlation);
  }

  @Get('current')
  @ApiOperation({ summary: 'Read the active roadmap and today tasks' })
  current(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(this.service.current(request.principal!), correlation);
  }

  @Post('recalculate')
  @ApiOperation({ summary: 'Supersede and regenerate the active roadmap' })
  recalculate(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(this.service.recalculate(request.principal!), correlation);
  }

  @Patch('items/:itemId/status')
  @ApiOperation({ summary: 'Update one owner roadmap task status' })
  updateItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() input: UpdateRoadmapItemDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.updateItem(request.principal!, itemId, input.status),
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
