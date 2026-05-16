import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController, BlindnessTypesController } from './users.controller';
import { User } from './entities/user.entity';
import { BlindnessType } from './entities/blindness-type.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, BlindnessType]), AuthModule],
  controllers: [UsersController, BlindnessTypesController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
