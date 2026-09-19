import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Attachment } from '../entities/message.entity';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;
  @IsString()
  @IsNotEmpty()
  senderId!: string;
  @IsArray()
  @IsOptional()
  attachments?: Attachment[];
  @IsString()
  @IsOptional()
  text?: string;
  @IsString()
  @IsOptional()
  reply?: string;
  @IsBoolean()
  @IsOptional()
  isForwarded?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
