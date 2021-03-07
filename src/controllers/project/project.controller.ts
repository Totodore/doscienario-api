import { Project } from './../../models/project.entity';
import { ImageService } from './../../services/image.service';
import { FileService } from './../../services/file.service';
import { File } from './../../models/file.entity';
import { Document } from 'src/models/document.entity';
import { BadRequestException, Body, Controller, ForbiddenException, Get, Header, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { GetUser, GetUserId } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { User } from 'src/models/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { ProjectAddDto } from './project-add.dto';
import { ProjectUserDto } from './project-user.dto';
import AdmZip from "adm-zip";
import { Request, Response } from 'express';
import { Image } from 'src/models/image.entity';
@Controller('project')
@UseGuards(UserGuard)
export class ProjectController {

  constructor(private readonly _logger: AppLogger, private readonly _fileManager: FileService, private readonly _imageManager: ImageService) {}

  @Post()
  async createProject(@Body() body: ProjectAddDto, @GetUser() user: User): Promise<Project> {
    if (await Project.exists({ where: { name: body.name } }))
      throw new BadRequestException();
    const project = Project.create({ name: body.name, createdBy: user });
    project.users = [user];
    return project.save();
  }

  @Post("/user")
  async addUser(@Body() body: ProjectUserDto, @GetUser({ joinProjects: true }) user: User): Promise<Project> {
    let project: Project = user.projects.find(el => el.id == body.projectId);
    if (!project)
      throw new ForbiddenException;
    this._logger.log(JSON.stringify(project));
    project = await Project.findOne(project.id, { relations: ["users"] });
    project.users.push(await User.findOne(body.userId));
    return await project.save();
  }

  @Get("/:id")
  async getProject(@Param("id") id: number, @GetUser({ joinProjects: true }) user: User): Promise<Project> {
    const project = await Project.findOne(id, { relations: ["users", "createdBy", "tags", "blueprints"] });
    const docs = await Document.find({ where: { project }, relations: ["tags", "images", "lastEditor"] });
    project.documents = docs;
    return project;
  }

  @Get("/:id/export")
  @Header("Content-Type", "application/zip")
  async exportProject(@Param("id") id: number, @GetUser() user: User, @Res() res: Response) {
    this._logger.log("Exporting project", id);
    const project = await Project.findOne(id);
    const images = await Image.find({ where: { project } });
    const files = await File.find({ where: { project } });
    
    const zip = new AdmZip();
    zip.addFile("data/", null);
    zip.addFile("data/images", null);
    zip.addFile("data/files", null);
    for (const image of images)
      zip.addFile(`data/images/${image.id}`, this._imageManager.getImage(image.id), "image_dir");
    for (const file of files)
      zip.addFile(`data/files/${file.id}`, this._fileManager.getFile(file.id), "file_dir");
    
    const buffer = zip.toBuffer();
    res.header("Content-Length", buffer.length.toString());
    return buffer;
  }
}
