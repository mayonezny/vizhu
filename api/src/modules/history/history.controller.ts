import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { HistoryService } from './history.service';
import * as jwtGuard from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('history')
@Controller('history')
@UseGuards(jwtGuard.JwtAuthGuard)
@ApiBearerAuth()
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'История запросов текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Список записей (до 50, по убыванию даты)',
  })
  findAll(@CurrentUser() user: jwtGuard.JwtPayload) {
    return this.history.findByUser(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Одна запись с полным диалогом' })
  @ApiResponse({ status: 200, description: 'HistoryEntry' })
  @ApiResponse({ status: 404, description: 'Запись не найдена' })
  findOne(@Param('id') id: string, @CurrentUser() user: jwtGuard.JwtPayload) {
    return this.history.findOne(id, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить запись' })
  @ApiResponse({ status: 204, description: 'Удалено' })
  @ApiResponse({ status: 404, description: 'Запись не найдена' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: jwtGuard.JwtPayload,
  ) {
    await this.history.remove(id, user.sub);
  }
}
