import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppLoggerService extends Logger {

  log(...message: any[]) {
    super.log(message.join(" "), "AppLogger");
  }
  warn(...message: any[]) {
    super.warn(message.join(" "), "AppLogger");
  }
  debug(...message: any[]) {
    super.debug(message.join(" "), "AppLogger")
  }
  verbose(...message: any[]) {
    super.verbose(message.join(" "), "AppLogger");
  }
}
