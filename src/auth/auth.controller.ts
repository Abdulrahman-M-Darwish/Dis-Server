import {
  Body,
  Controller,
  Post,
  Request,
  Response,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Public } from './is-public.decorator';
import { LoginDto } from './dto/login.dto';
import type { Response as ResponseT } from 'express';
import type { Request as RequestT } from 'express';
import { OtpService } from './otp.service';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from 'src/users/users.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password';
import { TokenService } from './token.service';

@Controller('auth')
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}
  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Response({ passthrough: true }) res: ResponseT,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.login(loginDto);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken };
  }
  @Post('logout')
  async logout(
    @Request() req: RequestT & { user: { userId: string } },
    @Response({ passthrough: true }) res: ResponseT,
  ) {
    await this.tokenService.revokeRefreshToken(req.user.userId);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { message: 'Logged out successfully' };
  }
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(
    @Request() req: RequestT & { user: { userId: string } },
    @Response({ passthrough: true }) res: ResponseT,
  ) {
    const { accessToken, refreshToken } = await this.authService.createTokens(
      req.user.userId,
    );
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken };
  }
  @Public()
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }
  @Public()
  @Post('verify-registration')
  async verifyOtp(@Body() signupDto: SignupDto) {
    await this.otpService.trackVerifyOtp(signupDto.email);
    await this.otpService.verifyOtp(signupDto.otp, signupDto.email);
    await this.usersService.create(signupDto);

    return { message: 'Registration verified' };
  }
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    const user = await this.usersService.findOne(email);
    if (!user) throw new UnauthorizedException('User not found');
    await this.otpService.trackSendOtp(email);
    await this.otpService.sendOtp(
      email,
      '',
      'forgot-password',
      'Your OTP Code for Password Reset',
    );

    return { message: 'Reset code sent' };
  }
  @Public()
  @Post('verify-forgot-password')
  async verifyForgotPassword(
    @Body() { email, otp, newPassword }: VerifyForgotPasswordDto,
  ) {
    await this.authService.verifyForgotPassword({ email, otp, newPassword });

    return { message: 'Password reset successful' };
  }
}
