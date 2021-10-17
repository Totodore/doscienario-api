import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Blueprint } from './models/blueprint/blueprint.entity';
import { Document } from './models/document/document.entity';
import { File } from './models/file/file.entity';
import { Image } from './models/image/image.entity';
import { Node } from './models/node/node.entity';
import { Project } from './models/project/project.entity';
import { Relationship } from './models/relationship/relationship.entity';
import { Sheet } from './models/sheet/sheet.entity';
import { Tag } from './models/tag/tag.entity';
import { User } from './models/user/user.entity';
import { UserController } from './controllers/user/user.controller';
import { JwtService } from './services/jwt.service';
import { AppLogger } from './utils/app-logger.util';
import { ImageService } from './services/image.service';
import { FileService } from './services/file.service';
import { ResController } from './controllers/res/res.controller';
import { DashboardGateway } from './sockets/dashboard.gateway';
import { ProjectController } from './controllers/project/project.controller';
import { ExportService } from './services/export.service';
import { DocsGateway } from './sockets/docs.gateway';
import { TreeGateway } from './sockets/tree.gateway';
import { BlueprintRepository } from './models/blueprint/blueprint.repository';
import { DocumentRepository } from './models/document/document.repository';
import { RelationshipRepository } from './models/relationship/relationship.repository';
import { NodeRepository } from './models/node/node.repository';
import { SocketService } from './services/socket.service';
import { SheetGateway } from './sockets/sheet.gateway';

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
      synchronize: process.env.NODE_ENV == "dev",
      logging: ["error"],
      // logging: true,
    }),
  ],
  controllers: [UserController, ResController, ProjectController],
  providers: [JwtService, FileService, ImageService, DashboardGateway, DocsGateway, TreeGateway, SheetGateway, ExportService, BlueprintRepository, DocumentRepository, NodeRepository, RelationshipRepository, SocketService],
})
export class AppModule { }
