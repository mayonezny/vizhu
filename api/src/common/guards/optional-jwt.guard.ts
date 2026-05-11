import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from './jwt.guard';

type RequestWithUser = {
  headers: Record<string, string | undefined>;
  user?: JwtPayload | null;
};

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const auth = req.headers['authorization'];

    if (!auth?.startsWith('Bearer ')) {
      req.user = null;
      return true;
    }

    try {
      req.user = this.jwt.verify<JwtPayload>(auth.slice(7));
    } catch {
      req.user = null;
    }
    return true;
  }
}
