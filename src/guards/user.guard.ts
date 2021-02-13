import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { User } from 'src/models/user.entity';
import { JwtService } from 'src/services/jwt.service';

@Injectable()
export class UserGuard implements CanActivate {

  constructor(private readonly _jwt: JwtService) { }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (this._jwt.verify(auth)) {
      return new Promise<boolean>(async resolve => {
        try {
          req.user = await User.findOne({ relations: ["projects"], where: { id: this._jwt.getUserId(auth) as string } });
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      });
    }
    return false;
  }
}
