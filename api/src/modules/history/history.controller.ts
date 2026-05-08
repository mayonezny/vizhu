// import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
// import { HistoryService } from './history.service';

// @Controller('history')
// export class HistoryController {
//   constructor(private readonly historyService: HistoryService) {}

//   // GET /api/history?userId=...
//   @Get()
//   findByUser(@Query('userId') userId: string) {
//     return this.historyService.findByUser(userId);
//   }

//   // PATCH /api/history/:id/star
//   @Patch(':id/star')
//   star(@Param('id') id: string, @Body('starred') starred: boolean) {
//     return this.historyService.star(id, starred);
//   }
// }
