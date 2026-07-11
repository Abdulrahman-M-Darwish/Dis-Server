import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyForgotPasswordDto {
  @IsEmail()
  email!: string;
  @IsString()
  @IsNotEmpty()
  otp!: string;
  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
