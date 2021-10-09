import { Injectable } from '@nestjs/common';

@Injectable()
export class SocketService {

  public sockets: Map<string, string> = new Map();
}
