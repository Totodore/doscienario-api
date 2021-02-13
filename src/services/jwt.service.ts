import { Injectable } from '@nestjs/common';
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";

@Injectable()
export class JwtService {

  public encode(key: string): string {
    return jwt.sign(key, process.env.PRIVATE_KEY);
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
    return jwt.decode(key);
  }

  public encodePassword(password: string): string {
    return bcrypt.hashSync(password, 4);
  }

  public verifyPassword(hash: string, password: string): boolean {
    return bcrypt.compareSync(password, hash);
  }
}
