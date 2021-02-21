import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestExpressApplication } from '@nestjs/platform-express';
global.atob = require("atob");
global.Blob = require("node-blob");

String.prototype.insert = function(what: string, index: number) {
  return index > 0
      ? this.replace(new RegExp('.{' + index + '}'), '$&' + what)
      : what + this;
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true
  });
  app.useGlobalPipes(new ValidationPipe());
  const config = new DocumentBuilder().setTitle('Doscenario API').setVersion('0.1').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(parseInt(process.env.PORT ?? "3000"));
}
bootstrap();
