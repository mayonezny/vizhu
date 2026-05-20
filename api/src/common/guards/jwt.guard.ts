import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;
  phone: string;
  iat: number;
  exp: number;
}

type RequestWithUser = {
  headers: Record<string, string | undefined>;
  user?: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const auth = req.headers['authorization'];

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не предоставлен');
    }

    try {
      req.user = this.jwt.verify<JwtPayload>(auth.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException('Токен недействителен');
    }
  }
}
