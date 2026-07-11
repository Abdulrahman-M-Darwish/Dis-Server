import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ChannelType } from '../entities/channel.entity';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  serverId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ChannelType)
  @IsNotEmpty()
  type: ChannelType;
}
