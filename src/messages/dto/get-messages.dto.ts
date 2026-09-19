import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesDto {
  @IsOptional()
  @IsString()
  beforeMessageId?: string;

  @IsNotEmpty()
  @IsString()
  conversationId!: string;

  @IsOptional()
  @IsString()
  clearedMessageId?: string;

  @IsOptional()
  @Type(() => Number) // Converts the string query parameter to a number
  @IsInt()
  @Min(1)
  @Max(100) // Caps the limit to prevent huge database scans
  limit?: number = 20;
}
