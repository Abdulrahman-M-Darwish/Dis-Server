import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ConversationType } from '../entities/conversation.entity';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  @IsNotEmpty()
  type!: ConversationType;
  @IsString()
  @IsOptional()
  groupName?: string;
  @IsString()
  @IsOptional()
  groupAvatarUrl?: string;
  @IsString()
  @IsOptional()
  admins?: string[];
  @IsArray()
  @IsNotEmpty()
  participants!: string[];
  @IsString()
  @IsOptional()
  lastMessage?: string;
}
