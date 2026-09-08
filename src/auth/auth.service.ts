import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { SignupDto } from './dto/signup.dto';
import { OtpService } from './otp.service';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
  ) {}
  async login({ email, password }: LoginDto) {
    const user = await this.usersService.findOne(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isMatch = await argon.verify(user.passwordHash, password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    return this.createTokens(user._id);
  }

  async createTokens(userId: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      { secret: process.env.JWT_SECRET, expiresIn: '10m' },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      { secret: process.env.JWT_SECRET, expiresIn: '7d' },
    );
    await this.tokenService.saveRefreshToken(
      userId,
      refreshToken,
      7 * 24 * 60 * 60,
    );
    return { accessToken, refreshToken };
  }
  async signup(signupDto: SignupDto) {
    const user = await this.usersService.findOne(signupDto.email);
    if (user) throw new UnauthorizedException('User already exists');
    await this.otpService.trackSendOtp(signupDto.email);
    await this.otpService.sendOtp(
      signupDto.email,
      signupDto.name,
      'send-otp',
      'Your OTP Code',
    );

    return { message: 'OTP sent to your email' };
  }
  async verifyForgotPassword({
    email,
    otp,
    newPassword,
  }: VerifyForgotPasswordDto) {
    const user = await this.usersService.findOne(email);
    if (!user) throw new BadRequestException('User Not Found');
    await this.otpService.trackVerifyOtp(email);
    await this.otpService.verifyOtp(otp, email);
    await this.usersService.update(user._id, { passwordHash: newPassword });
  }
}
