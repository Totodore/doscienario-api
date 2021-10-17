import { Injectable } from '@nestjs/common';
import { Document } from 'src/models/document/document.entity';
import { Sheet } from 'src/models/sheet/sheet.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { CacheUtil } from 'src/utils/cache-sys.util';

@Injectable()
export class SocketService {

  public sockets: Map<string, string> = new Map();
  public docCache = new CacheUtil(new AppLogger(), Document);
  public sheetCache = new CacheUtil(new AppLogger(), Sheet);
}
