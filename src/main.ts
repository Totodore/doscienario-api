import { Document } from 'src/models/document/document.entity';
import { Node } from './models/node/node.entity';
import { AppLogger } from './utils/app-logger.util';
import { CacheUtil } from './utils/cache-sys.util';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentRepository } from './models/document/document.repository';
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