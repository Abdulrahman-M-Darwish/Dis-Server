import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  username!: string;
  @IsString()
  @IsNotEmpty()
  name!: string;
  @IsEmail()
  email!: string;
  @IsString()
  @IsNotEmpty()
  passwordHash!: string;
  @IsString()
  @IsOptional()
  otp!: string;
}
