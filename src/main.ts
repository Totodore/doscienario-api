import { Document } from 'src/models/document.entity';
import { Node } from './models/node.entity';
import { AppLogger } from './utils/app-logger.util';
import { CacheUtil } from './utils/cache-sys.util';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestExpressApplication } from '@nestjs/platform-express';
global.atob = require("atob");
global.Blob = require("node-blob");

String.prototype.insert = function (index: number, what: string) {
  return index > 0
      ? this.replace(new RegExp('.{' + index + '}'), '$&' + what)
      : what + this;
};
String.prototype.delete = function(from: number, length: number = 1) {
  return this.substring(0, from) + this.substring(from + length, this.length);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();

  await app.listen(parseInt(process.env.PORT ?? "3000"));
}
bootstrap();

export const nodeCache = new CacheUtil(new AppLogger(), Node);
export const docCache = new CacheUtil(new AppLogger(), Document);
