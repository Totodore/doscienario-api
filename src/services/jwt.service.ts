import { Injectable } from '@nestjs/common';
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";

@Injectable()
export class JwtService {

  public encode(key: string): string {
    return jwt.sign({ sub: key, exp: Date.now() + 600_000_000_000_000 }, process.env.PRIVATE_KEY);
  }

  public verify(key: string): boolean {
    try {
      jwt.verify(key, process.env.PRIVATE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  public getUserId(key: string) {
    return (jwt.decode(key, { json: true }) as jwt.JwtPayload).sub;
  }

  public encodePassword(password: string): string {
    return bcrypt.hashSync(password, 4);
  }

  public verifyPassword(hash: string, password: string): boolean {
    return bcrypt.compareSync(password, hash);
  }
}
