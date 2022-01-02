import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { JwtService } from 'src/services/jwt.service';

@Injectable()
export class UserGuard implements CanActivate {

  constructor(private readonly _jwt: JwtService) { }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (context.getType() === 'http') {
      const req: Request = context.switchToHttp().getRequest();
      const auth = req.headers.authorization;
      if (this._jwt.verify(auth)) {
        req.headers.user = this._jwt.getUserId(auth).toString();
        return true;
      } else return false;
    }
    return true;
  }
}
