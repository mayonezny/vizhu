import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  room!: string;

  @IsIn(['blind', 'volunteer'])
  role!: 'blind' | 'volunteer';
}
