import { ExportService } from './../../services/export.service';
import { BadRequestException, Body, Controller, Get, Header, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser, GetUserId } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { File } from 'src/models/file.entity';
import { User } from 'src/models/user.entity';
import { FileService } from 'src/services/file.service';
import { ImageService } from 'src/services/image.service';
import { ResAddDto } from './res-add.dto';

import * as uuid from "uuid";
import { Image } from 'src/models/image.entity';
import { ImageAddDto } from './image-add.dto';
import { Response } from 'express';
import { Project } from 'src/models/project.entity';

@Controller('res')
export class ResController {

  constructor(
    private readonly _files: FileService,
    private readonly _images: ImageService,
    private readonly _export: ExportService
  ) {}

  @Post("/file")
  @UseGuards(UserGuard)
  @UseInterceptors(FileInterceptor("file"))
  async addFile(@UploadedFile() file: Express.Multer.File, @Body() body: ResAddDto, @GetUserId() user: string): Promise<File> {
    const id = uuid.v4();
    const mime = await this._files.writeFile(file.buffer, id);
    return File.create({
      id,
      mime,
      path: body.path,
      createdById: user,
      size: file.buffer.length,
      projectId: body.projectId,
    });
  }

  @Post("/:id/image")
  @UseGuards(UserGuard)
  @UseInterceptors(FileInterceptor("upload"))
  async addImage(@UploadedFile() file: Express.Multer.File, @GetUser() user: User, @Param("id") projectId: number): Promise<{ url: string } | { error: { message: string } }> {
    try {
      const id = uuid.v4();
      const data = await this._images.writeImage(file.buffer, id);
      await Image.create({
        id,
        addedBy: user,
        size: data[0],
        width: data[1],
        height: data[2],
        project: new Project(projectId)
      }).save();
      return { url: `${process.env.ROOT_URL}/res/image/${id}` };
    } catch (error) {
      return { error: { message: "Impossible d'envoyer l'image !"} };
    }
  }

  @Get("/image/:id")
  @Header('Content-Type', "image/webp")
  async getImage(@Param('id') id: string, @Res() res: Response) {
    try {
      const buffer = this._images.getImage(id);
      res.header('Content-Length', buffer.length.toString());
      res.write(buffer, 'binary');
      res.end();
    } catch (e) {
      throw new BadRequestException();
    }
  }

  @Get("/file/:id")
  @UseGuards(UserGuard)
  async getFile(@Param("id") id: number, @Res() res: Response) {
    try {
      const file = await File.findOne(id);
      const buffer = this._files.getFile(file.path);
      res.header('Content-Type', file.mime);
      res.header('Content-Length', buffer.length.toString());
      res.write(buffer, 'binary');
      res.end();
    } catch (e) {
      throw new BadRequestException();
    }
  }

  @Get("/exported-data/:id")
  @Header("Content-Type", "application/zip")
  public getExportedData(@Param("id") id: string, @Res() res: Response) {
    const buffer = this._export.getFile(id);
    res.header("Content-Length", buffer.length.toString());
    res.write(buffer, 'binary');
    res.end();
    this._export.removeFile(id);
  }

}
