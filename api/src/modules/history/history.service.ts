import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoryEntry, RequestType } from './history.entity';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(HistoryEntry)
    private readonly repo: Repository<HistoryEntry>,
  ) {}

  save(userId: string | undefined, type: RequestType, result: string) {
    return this.repo.save({ userId, type, result });
  }

  findByUser(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  star(id: string, starred: boolean) {
    return this.repo.update(id, { starred });
  }
}
