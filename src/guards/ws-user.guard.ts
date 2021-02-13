import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { JwtService } from 'src/services/jwt.service';

@Injectable()
export class WsUserGuard implements CanActivate {

  constructor(private readonly _jwt: JwtService) { }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const ws: Socket = context.switchToWs().getClient();
    const auth = ws.handshake.headers.authorization;
    if (!this._jwt.verify(auth))
      return false;
    ws.handshake.headers.user = this._jwt.getUserId(auth);
    return true;
  }
}
