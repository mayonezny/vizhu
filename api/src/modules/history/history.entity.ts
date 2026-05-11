import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type RequestType = 'describe' | 'currency' | 'ocr' | 'volunteer';

export interface HistoryMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

@Entity('history_entries')
export class HistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'phone_account_id', nullable: true })
  phoneAccountId!: string | null;

  @Column({ type: 'enum', enum: ['describe', 'currency', 'ocr', 'volunteer'] })
  type!: RequestType;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'jsonb', default: [] })
  messages!: HistoryMessage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
