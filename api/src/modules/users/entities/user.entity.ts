import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PhoneAccount } from './phone-account.entity';
import { BlindnessType } from './blindness-type.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'phone_account_id', unique: true })
  phoneAccountId!: string;

  @OneToOne(() => PhoneAccount)
  @JoinColumn({ name: 'phone_account_id' })
  phoneAccount!: PhoneAccount;

  @Column({ length: 255 })
  name!: string;

  @Column({ nullable: true, type: 'integer' })
  age!: number | null;

  @Column({ name: 'blindness_type_id', nullable: true, type: 'integer' })
  blindnessTypeId!: number | null;

  @ManyToOne(() => BlindnessType, { nullable: true, eager: false })
  @JoinColumn({ name: 'blindness_type_id' })
  blindnessType!: BlindnessType | null;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
