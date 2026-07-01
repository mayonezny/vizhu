import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  room!: string;

  @IsIn(['caller', 'helper'])
  role!: 'caller' | 'helper';
}
