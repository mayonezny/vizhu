import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

@Entity('phone_accounts')
export class PhoneAccount {
  @PrimaryColumn('uuid')
  uuid!: string;

  @Column({ unique: true, length: 20 })
  phone!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @BeforeInsert()
  generateId() {
    if (!this.uuid) this.uuid = uuidv7();
  }
}
