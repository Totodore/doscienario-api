import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { Blueprint } from './models/blueprint.entity';
import { Document } from './models/document.entity';
import { File } from './models/file.entity';
import { Image } from './models/image.entity';
import { Node } from './models/node.entity';
import { Project } from './models/project.entity';
import { Relationship } from './models/relationship.entity';
import { Sheet } from './models/sheet.entity';
import { Tag } from './models/tag.entity';
import { User } from './models/user.entity';
import { UserController } from './controllers/user/user.controller';
import { JwtService } from './services/jwt.service';
import { AppLogger } from './utils/app-logger.service';
import { ImageService } from './services/image.service';
import { FileService } from './services/file.service';
import { ResController } from './controllers/res/res.controller';

@Module({
  imports: [
    AppLogger,
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [
        User,
        Project,
        Blueprint,
        Document,
        File,
        Image,
        Node,
        Relationship,
        Sheet,
        Tag,
      ],
      synchronize: true,
    }),
  ],
  controllers: [AppController, UserController, ResController],
  providers: [AppService, JwtService, FileService, ImageService],
})
export class AppModule {}
