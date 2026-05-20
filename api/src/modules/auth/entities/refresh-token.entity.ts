import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { PhoneAccount } from '../../users/entities/phone-account.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'phone_account_id' })
  phoneAccountId!: string;

  @ManyToOne(() => PhoneAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phone_account_id' })
  phoneAccount!: PhoneAccount;

  // SHA-256 от токена — в куке хранится сырой токен, в БД — хэш
  @Column({ name: 'token_hash', unique: true, length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
