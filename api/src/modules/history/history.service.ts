import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoryEntry, HistoryMessage, RequestType } from './history.entity';

export interface CreateHistoryData {
  phoneAccountId: string | null;
  type: RequestType;
  title: string;
  messages: HistoryMessage[];
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(HistoryEntry)
    private readonly repo: Repository<HistoryEntry>,
  ) {}

  create(data: CreateHistoryData): Promise<HistoryEntry> {
    return this.repo.save(this.repo.create(data));
  }

  findByUser(phoneAccountId: string): Promise<HistoryEntry[]> {
    return this.repo.find({
      where: { phoneAccountId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async findOne(id: string, phoneAccountId: string): Promise<HistoryEntry> {
    const entry = await this.repo.findOne({ where: { id, phoneAccountId } });
    if (!entry) throw new NotFoundException('Запись не найдена');
    return entry;
  }

  async remove(id: string, phoneAccountId: string): Promise<void> {
    await this.findOne(id, phoneAccountId);
    await this.repo.delete(id);
  }
}
