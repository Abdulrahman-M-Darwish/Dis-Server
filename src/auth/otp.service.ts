import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { Resend } from 'resend';
import path from 'path';
import ejs from 'ejs';
import crypto from 'crypto';

@Injectable()
export class OtpService implements OnModuleInit {
  private resend!: Resend;
  constructor(private readonly redisService: RedisService) {}
  onModuleInit() {
    // Instantiate Resend once when the module loads
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }
  renderTemplate(templateName: string, data: Record<string, string>) {
    const templatePath = path.resolve(
      __dirname,
      '..',
      'constants',
      'emails',
      `${templateName}.ejs`,
    );
    return ejs.renderFile(templatePath, data);
  }

  async sendOtp(
    email: string,
    name: string,
    templateName: string,
    subject: string,
  ) {
    const otp = crypto.randomBytes(3).toString('hex');
    try {
      await this.resend.emails.send({
        from: 'Dis Team <onboarding@resend.dev>',
        to: [email],
        subject: subject,
        html: await this.renderTemplate(templateName, { name, otp }),
      });
      await this.redisService.set(`otp:${email}`, otp, {
        expiration: { type: 'EX', value: 5 * 60 },
      });
      await this.redisService.set(`otp_cooldown:${email}`, 'true', {
        expiration: { type: 'EX', value: 60 },
      });
    } catch (error) {
      console.error('Error sending OTP email:', error);
    }
  }

  async verifyOtp(otp: string, email: string) {
    await this.trackVerifyOtp(email);
    const storedOtp = await this.redisService.get(`otp:${email}`);
    if (typeof storedOtp !== 'string' || otp.length !== storedOtp.length) {
      throw new BadRequestException('Invalid OTP');
    }
    if (!crypto.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(otp))) {
      throw new BadRequestException('Invalid OTP');
    }
    await this.redisService.del(`otp:${email}`);
    await this.redisService.del(`otp_verify_attempts:${email}`);
    await this.redisService.del(`otp_attempts:${email}`);
  }

  async trackVerifyOtp(email: string) {
    if (await this.redisService.get(`otp_lock:${email}`)) {
      throw new BadRequestException(
        'Too many OTP verification attempts. Please try again later.',
      );
    }
    const key = `otp_verify_attempts:${email}`;
    const attempts = await this.redisService.incr(key);
    if (attempts === 1) {
      // Set TTL only on the first attempt
      await this.redisService.expire(key, 30 * 60);
    }
    if (attempts > 5) {
      await this.redisService.set(`otp_lock:${email}`, 'true', {
        expiration: { type: 'EX', value: 30 * 60 },
      });
      await this.redisService.del(key);
      await this.redisService.del(`otp:${email}`);
      await this.redisService.del(`otp_attempts:${email}`);
      throw new BadRequestException(
        'Too many OTP verification attempts. Please try again later.',
      );
    }
  }

  async trackSendOtp(email: string) {
    if (await this.redisService.get(`otp_cooldown:${email}`)) {
      throw new BadRequestException(
        'Too many OTP attempts. Please try again later.',
      );
    }
    if (await this.redisService.get(`otp_lock:${email}`)) {
      throw new BadRequestException(
        'Too many OTP attempts. Please try again later.',
      );
    }
    const key = `otp_attempts:${email}`;
    const attempts = await this.redisService.incr(key);
    if (attempts === 1) {
      await this.redisService.expire(key, 30 * 60);
    }
    if (attempts > 5) {
      await this.redisService.set(`otp_lock:${email}`, 'true', {
        expiration: { type: 'EX', value: 30 * 60 },
      });
      await this.redisService.del(key);
      throw new BadRequestException(
        'Too many OTP attempts. Please try again later.',
      );
    }
  }
}
