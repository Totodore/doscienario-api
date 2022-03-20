import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createWriteStream, WriteStream } from "fs";
import { readFile } from "fs/promises";
import * as path from "path";
@Injectable()
export class AppLogger extends Logger implements OnModuleInit {

  private static _instance: AppLogger;
  
  constructor() {
    super();
    AppLogger._instance ??= this;
  }

  private fileStream: WriteStream;
  public onModuleInit() {
    const logPath = path.resolve(`./data/logs/${new Date().toISOString().replace(/:/g, '-')}.log`);
    this.log("Log file path:", logPath);
    this.fileStream = createWriteStream(logPath);
    this.patchStdout();
    this.log("Logger initialized");
  }

  public info(...message: any[]) {
    super.log(message.join(" "), this.getCaller());
  }
  public log(...message: any[]) {
    super.log(message.join(" "), this.getCaller());
  }
  public warn(...message: any[]) {
    super.warn(message.join(" "), this.getCaller());
  }
  public debug(...message: any[]) {
    super.debug(message.join(" "), this.getCaller())
  }
  public verbose(...message: any[]) {
    super.verbose(message.join(" "), this.getCaller());
  }
  public error(...message: (string | Error)[]) {
    const error = message[message.length - 1];
    if (error instanceof Error)
      super.error(message.slice(0, -1), error.stack, this.getCaller());
    else
      super.error(message.join(" "), "", this.getCaller());
  }

  public async getServerLogs(): Promise<string> {
    return readFile(this.fileStream.path, "utf8");
  }

  public static get instance() {
    return AppLogger._instance;
  }

  private patchStdout() {
    const stdout0 = process.stdout.write;
    const stderr0 = process.stderr.write;
    process.stdout.write = (buffer: string | Buffer, ...args: any[]) => {
      this.fileStream.write(buffer.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ""), ...args);
      return stdout0.apply(process.stdout, [buffer, ...args]);
    }
    process.stderr.write = (buffer: string | Buffer, ...args: any[]) => {
      this.fileStream.write(buffer.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ""), ...args);
      return stderr0.apply(process.stderr, [buffer, ...args]);
    }
    process.on('uncaughtException', function(err) {
      console.error((err && err.stack) ? err.stack : err);
    });
  }

  private getCaller(): string {
    const error = new Error();
    let stackLine = 3;
    try {
      throw error;
    } catch (e) {
      const stack = e.stack.split("\n");
      const line: string = stack[stackLine];
      const className: string = line.match(/([A-Z])\w+/g)?.[0] || "<anonymous>";
      let methodName: string = line.match(/(?<=\.)(.+)(?= )/gi)?.[0] || "<anonymous>";
      if (line.match(/new ([A-Z])\w+/g))
        methodName = "constructor";
      return `${className}::${methodName}`;
    }
  }
}