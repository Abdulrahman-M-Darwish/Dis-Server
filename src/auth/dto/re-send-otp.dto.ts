import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ReSendOtpDto {
  @IsEmail()
  email!: string;
  @IsString()
  @IsNotEmpty()
  name!: string;
}
