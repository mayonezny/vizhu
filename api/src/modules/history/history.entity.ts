import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type RequestType = 'describe' | 'currency' | 'ocr';

@Entity('history')
export class HistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;   // null для анонимных

  @Column({ type: 'enum', enum: ['describe', 'currency', 'ocr'] })
  type: RequestType;

  @Column('text')
  result: string;   // ответ AI

  @Column({ default: false })
  starred: boolean; // «полезно» (ФТ-14)

  @CreateDateColumn()
  createdAt: Date;
}
