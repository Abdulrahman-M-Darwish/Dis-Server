import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenService } from './token.service';

const extractRefreshToken = (req: Request): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const refreshTokenCookie = cookieHeader
    .split(';')
    .find((cookie) => cookie.trim().startsWith('refreshToken='));

  if (!refreshTokenCookie) return null;
  return decodeURIComponent(refreshTokenCookie.split('=').slice(1).join('='));
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly tokenService: TokenService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      secretOrKey: process.env.JWT_SECRET as string,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string }) {
    const refreshToken = extractRefreshToken(req);
    if (
      !refreshToken ||
      !(await this.tokenService.isTokenValid(payload.sub, refreshToken))
    ) {
      req?.res?.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      await this.tokenService.revokeRefreshToken(payload.sub);
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { userId: payload.sub };
  }
}
