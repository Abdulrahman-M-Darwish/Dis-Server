import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import mongoose from 'mongoose';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  serverId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsOptional()
  roleIds: mongoose.Types.ObjectId[];
}
