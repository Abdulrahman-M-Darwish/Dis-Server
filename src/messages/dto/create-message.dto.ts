import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Attachment } from 'nodemailer/lib/mailer';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;
  @IsString()
  @IsNotEmpty()
  senderId!: string;
  @IsArray()
  @IsOptional()
  attachment?: Attachment[];
  @IsString()
  @IsOptional()
  text?: string;
  @IsString()
  @IsOptional()
  reply?: string;
  @IsBoolean()
  @IsOptional()
  isForwarded?: boolean;
}
