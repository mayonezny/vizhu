import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BlindnessType } from './entities/blindness-type.entity';

interface CreateProfileData {
  name: string;
  age?: number;
  blindnessTypeId?: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BlindnessType)
    private readonly blindnessTypeRepo: Repository<BlindnessType>,
  ) {}

  async createProfile(
    phoneAccountId: string,
    data: CreateProfileData,
  ): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { phoneAccountId } });
    if (existing) throw new ConflictException('Профиль уже существует');

    const user = this.userRepo.create({
      phoneAccountId,
      name: data.name,
      age: data.age ?? null,
      blindnessTypeId: data.blindnessTypeId ?? null,
      isVerified: true,
    });
    return this.userRepo.save(user);
  }

  async getProfile(phoneAccountId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { phoneAccountId },
      relations: ['blindnessType'],
    });
    if (!user) throw new NotFoundException('Профиль не найден');
    return user;
  }

  async getBlindnessTypes(): Promise<BlindnessType[]> {
    return this.blindnessTypeRepo.find({ order: { name: 'ASC' } });
  }
}
