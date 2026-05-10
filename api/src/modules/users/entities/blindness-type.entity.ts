import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('blindness_types')
export class BlindnessType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 100 })
  name!: string;
}
