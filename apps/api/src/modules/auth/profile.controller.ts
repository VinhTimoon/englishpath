import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from './auth-request';
import { RequireOwner } from './auth.decorators';
import {
  authCorrelationId,
  AuthExceptionFilter,
} from './auth-exception.filter';
import {
  AuthenticationGuard,
  OwnerGuard,
  RequiredRoleGuard,
} from './auth.guards';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

const bodyValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('profile')
@ApiBearerAuth()
@Controller('api/v1/profile')
@UseFilters(AuthExceptionFilter)
@UseGuards(AuthenticationGuard, RequiredRoleGuard, OwnerGuard)
@RequireOwner('profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Read the authenticated user profile' })
  @ApiOkResponse({ description: 'Owner profile or null when not initialized' })
  @ApiUnauthorizedResponse({ description: 'Invalid identity evidence' })
  async get(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlationHeader?: string,
  ) {
    return {
      data: await this.profiles.get(request.principal!),
      meta: this.meta(correlationHeader),
    };
  }

  @Patch()
  @UsePipes(bodyValidation)
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ description: 'Updated owner profile' })
  async patch(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
    @Headers('x-correlation-id') correlationHeader?: string,
  ) {
    return {
      data: await this.profiles.update(request.principal!, body),
      meta: this.meta(correlationHeader),
    };
  }

  private meta(correlationHeader?: string) {
    return {
      correlationId: authCorrelationId(correlationHeader),
      idempotencyStatus: 'not_applicable',
    };
  }
}
