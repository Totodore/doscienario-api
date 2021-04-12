import { CacheService } from './../../services/cache.service';
import { User } from './../../models/user.entity';
import { Relationship } from './../../models/relationship.entity';
import { Image } from './../../models/image.entity';
import { Node } from './../../models/node.entity';
import { createQueryBuilder } from 'typeorm';
import { ExportService } from './../../services/export.service';
import { Tag } from './../../models/tag.entity';
import { Project } from './../../models/project.entity';
import { ImageService } from './../../services/image.service';
import { FileService } from './../../services/file.service';
import { File } from './../../models/file.entity';
import { Document } from 'src/models/document.entity';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Header, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { GetUser, GetUserId } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { AppLogger } from 'src/utils/app-logger.util';
import { ProjectAddDto } from './project-add.dto';
import { ProjectUserDto } from './project-user.dto';
import * as AdmZip from "adm-zip";
import { v4 as uuid } from "uuid";
import { FileInterceptor } from '@nestjs/platform-express';
import { Blueprint } from 'src/models/blueprint.entity';
@Controller('project')
@UseGuards(UserGuard)
export class ProjectController {

  constructor(
    private readonly _logger: AppLogger, 
    private readonly _fileManager: FileService,
    private readonly _imageManager: ImageService,
    private readonly _exportManager: ExportService,
    private readonly _cacheManager: CacheService
  ) { }

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
    const project = await Project.findOne(id, { relations: ["users", "createdBy", "tags"] });
    const docs = await Document.find({ where: { project }, relations: ["tags", "lastEditor"] });
    const blueprints = await Blueprint.find({ where: { project }, relations: ["tags", "lastEditor"] });
    project.documents = docs;
    project.blueprints = blueprints;
    return project;
  }

  @Delete("/:id")
  async deleteProject(@Param("id") id: number) {
    const project = new Project(id);
    await createQueryBuilder(Document, 'doc').relation(Tag, "tags").delete().execute();
    await createQueryBuilder(Blueprint, 'blueprint').relation(Tag, "tags").delete().execute();
    await Document.delete({ project });
    await Blueprint.delete({ project });
    await Tag.delete({ project });
    await Image.delete({ project });
    // await createQueryBuilder(Project, 'project').relation(User, "user").delete().execute();
    await Project.delete({ id });
  }

  @Get("/:id/export")
  async exportProject(@Param("id") id: number): Promise<{ id: string }> {
    this._logger.log("Exporting project", id);
    await this._cacheManager.saveDocs();
    const project = await Project.findOne(id, { select: ["name", "id"]});
    const docs = await Document.find({ where: { project: new Project(id) }, relations: ["tags"], select: ["content", "title", "id"] });
    const tags = await Tag.find({ where: { project }, select: ["name", "id", "color", "primary"] });
    const images = await Image.find({ where: { project: new Project(id) }, select: ["height", "width", "id", "size"] });
    // const files = await File.find({ where: { project }, select: ["mime", "path", "id"], relations: ["tags"]});
    // const blueprints = await Blueprint.find({ where: { project }, select: ["id", "name"], relations: ["tags"] });
    // const nodes = await Node.find({ where: project, relations: ["parentsRelations", "childsRelations", "tags"], select: ["content", "id", "blueprintId", "title"] });
    const zip = new AdmZip();
    zip.addFile("docs.json", Buffer.from(JSON.stringify(docs), "utf-8"));
    zip.addFile("tags.json", Buffer.from(JSON.stringify(tags), "utf-8"));
    zip.addFile("project.json", Buffer.from(JSON.stringify(project), "utf-8"));
    zip.addFile("images.json", Buffer.from(JSON.stringify(images), "utf-8"));
    // zip.addFile("files.json", Buffer.from(JSON.stringify(files)));
    // zip.addFile("blueprints.json", Buffer.from(JSON.stringify(blueprints)));
    // zip.addFile("nodes.json", Buffer.from(JSON.stringify(nodes)));

    for (const image of images)
      zip.addFile(`data/images/${image.id}`, this._imageManager.getImage(image.id), "image_dir");
    // for (const file of files)
    //   zip.addFile(`data/files/${file.id}`, this._fileManager.getFile(file.id), "file_dir");
    
    const fileId = uuid();
    await this._exportManager.writeFile(zip.toBuffer(), fileId);
    return { id: fileId };
  }
  
  @Post("/import")
  @UseGuards(UserGuard)
  @UseInterceptors(FileInterceptor("data"))
  async importProject(@GetUser() user: User, @UploadedFile() data: Express.Multer.File) {
    this._logger.log("importing project");
    const zip = new AdmZip(data.buffer);
    const project: Project = JSON.parse(zip.readFile("project.json").toString("utf-8"));
    const docs: Document[] = JSON.parse(zip.readFile("docs.json").toString("utf-8"));
    const tags: Tag[] = JSON.parse(zip.readFile("tags.json").toString("utf-8"));
    const images: Image[] = JSON.parse(zip.readFile("images.json").toString("utf-8"));

    /** 
     * Import project and get its id 
     */
    const projectId = (await Project.create({ name: project.name, createdBy: user, users: [user] }).save()).id;
    // Import all images
    for (const img of images)
      await Image.create({...img, project: new Project(projectId)}).save();
    /** 
     * Create a tag map for corresponding new id to old id 
     */
    const tagMap: Map<number, number> = new Map<number, number>();
    for (const tag of tags)
      tagMap.set(tag.id, (await Tag.create({
        name: tag.name,
        color: tag.color,
        primary: tag.primary,
        createdBy: user,
        project: new Project(projectId),
      }).save()).id);
    
    /** 
     * Create docs with the new tag list for the docs 
     */
    for (const doc of docs)
      await Document.create({
        content: doc.content,
        title: doc.title,
        createdBy: user,
        project: new Project(projectId),
        tags: doc.tags.map(oldTag => new Tag(tagMap.get(oldTag.id)))
      }).save();
    /** 
     * Importing the images buffer 
     */
    for (const img of zip.getEntries().filter(el => el.comment === "image_dir"))
      await this._imageManager.writeImage(img.getData(), img.name);
  }
}
