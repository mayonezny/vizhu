import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import * as jwtGuard from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class CreateProfileBody {
  @ApiProperty({ example: 'Иван', description: 'Имя пользователя' })
  name?: unknown;

  @ApiProperty({ example: 25, description: 'Возраст', required: false })
  age?: unknown;

  @ApiProperty({
    example: 1,
    description: 'ID типа слепоты из /blindness-types',
    required: false,
  })
  blindnessTypeId?: unknown;
}

@ApiTags('profile')
@Controller('profile')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @UseGuards(jwtGuard.JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Заполнить профиль (шаг после первого входа)' })
  @ApiBody({ type: CreateProfileBody })
  @ApiResponse({ status: 201, description: 'Профиль создан' })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  @ApiResponse({ status: 409, description: 'Профиль уже существует' })
  async createProfile(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Body() body: CreateProfileBody,
  ) {
    const { name, age, blindnessTypeId } = body;

    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestException('Укажите имя (минимум 2 символа)');
    }
    if (age !== undefined && age !== null) {
      if (typeof age !== 'number' || !Number.isInteger(age) || age < 0) {
        throw new BadRequestException(
          'Возраст должен быть целым неотрицательным числом',
        );
      }
    }
    if (blindnessTypeId !== undefined && blindnessTypeId !== null) {
      if (
        typeof blindnessTypeId !== 'number' ||
        !Number.isInteger(blindnessTypeId)
      ) {
        throw new BadRequestException('blindnessTypeId должен быть числом');
      }
    }

    return this.users.createProfile(user.sub, {
      name: name.trim(),
      age: typeof age === 'number' ? age : undefined,
      blindnessTypeId:
        typeof blindnessTypeId === 'number' ? blindnessTypeId : undefined,
    });
  }

  @Get()
  @UseGuards(jwtGuard.JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async getProfile(@CurrentUser() user: jwtGuard.JwtPayload) {
    return this.users.getProfile(user.sub);
  }
}

@ApiTags('blindness-types')
@Controller('blindness-types')
export class BlindnessTypesController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Список типов слепоты для выбора при регистрации' })
  @ApiResponse({ status: 200, description: 'Список типов' })
  async getAll() {
    return this.users.getBlindnessTypes();
  }
}
