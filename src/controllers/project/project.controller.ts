import { Relationship } from '../../models/relationship/relationship.entity';
import { User } from '../../models/user/user.entity';
import { Image } from '../../models/image/image.entity';
import { Node } from '../../models/node/node.entity';
import { createQueryBuilder } from 'typeorm';
import { ExportService } from './../../services/export.service';
import { Tag } from '../../models/tag/tag.entity';
import { Project } from '../../models/project/project.entity';
import { ImageService } from './../../services/image.service';
import { FileService } from './../../services/file.service';
import { Document } from 'src/models/document/document.entity';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Header, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { GetUser, GetUserId } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { AppLogger } from 'src/utils/app-logger.util';
import { ProjectAddDto } from './project-add.dto';
import { ProjectUserDto } from './project-user.dto';
import * as AdmZip from "adm-zip";
import { v4 as uuid } from "uuid";
import { FileInterceptor } from '@nestjs/platform-express';
import { Blueprint } from 'src/models/blueprint/blueprint.entity';
import { SocketService } from 'src/services/socket.service';
@Controller('project')
@UseGuards(UserGuard)
export class ProjectController {

  constructor(
    private readonly _logger: AppLogger, 
    private readonly _imageManager: ImageService,
    private readonly _exportManager: ExportService,
    private readonly _socketManager: SocketService,
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
    return createQueryBuilder(Project, 'project')
      .where('project.id = :id', { id, user })
      .leftJoinAndSelect('project.users', 'user')
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .leftJoinAndSelect('project.tags', 'tag')
      .leftJoinAndSelect('project.documents', 'documents')
      .leftJoinAndSelect('documents.tags', 'documentTag')
      .leftJoinAndSelect('documents.lastEditor', 'documentLastEditor')
      .leftJoinAndSelect('project.blueprints', 'blueprints')
      .leftJoinAndSelect('blueprints.tags', 'blueprintTag')
      .leftJoinAndSelect('blueprints.lastEditor', 'blueprintLastEditor')
      .getOne();
  }

  @Delete("/:id")
  async deleteProject(@Param("id") id: number) {
    const project = new Project(id);
    await this._socketManager.docCache.saveDocs();
    for (const document of await Document.find({ project }))
      await document.remove();
    for (const blueprint of await Blueprint.find({ project })) {
      await Node.delete({ blueprint });
      await Relationship.delete({ blueprint });
      await blueprint.remove();
    }
    await Tag.delete({ project });
    await Image.delete({ project });
    await Project.delete({ id });
  }

  @Get("/:id/export")
  async exportProject(@Param("id") id: number): Promise<{ id: string }> {
    this._logger.log("Exporting project", id);
    await this._socketManager.docCache.saveDocs();
    const project = await Project.findOne(id, { select: ["name", "id"]});
    const docs = await Document.find({ where: { project: new Project(id) }, relations: ["tags"], select: ["content", "title", "id"] });
    const tags = await Tag.find({ where: { project }, select: ["title", "id", "color", "primary"] });
    const images = await Image.find({ where: { project: new Project(id) }, select: ["height", "width", "id", "size"] });
    const blueprints = await Blueprint.find({ where: { project }, select: ["id", "title", "x", "y"], relations: ["tags", "nodes", "relationships"] });
    // const files = await File.find({ where: { project }, select: ["mime", "path", "id"], relations: ["tags"]});
    const nodes: Node[] = blueprints.reduce((prev, curr) => {
      const nodes = curr.nodes;
      delete curr.nodes;
      return [...prev, ...nodes];
    }, []);
    const rels: Relationship[] = blueprints.reduce((prev, curr) => {
      const rels = curr.relationships;
      delete curr.relationships;
      return [...prev, ...rels];
    }, []);
  
    const zip = new AdmZip();
    zip.addFile("docs.json", Buffer.from(JSON.stringify(docs), "utf-8"));
    zip.addFile("tags.json", Buffer.from(JSON.stringify(tags), "utf-8"));
    zip.addFile("project.json", Buffer.from(JSON.stringify(project), "utf-8"));
    zip.addFile("images.json", Buffer.from(JSON.stringify(images), "utf-8"));
    zip.addFile("blueprints.json", Buffer.from(JSON.stringify(blueprints), "utf-8"));
    zip.addFile("nodes.json", Buffer.from(JSON.stringify(nodes)));
    zip.addFile("relationships.json", Buffer.from(JSON.stringify(rels)));
    // zip.addFile("files.json", Buffer.from(JSON.stringify(files)));

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
    const blueprints: Blueprint[] = JSON.parse(zip.readFile("blueprints.json").toString("utf-8"));
    const nodes: Node[] = JSON.parse(zip.readFile("nodes.json").toString("utf-8"));
    const relationships: Relationship[] = JSON.parse(zip.readFile("relationships.json").toString("utf-8"));
    /** 
     * Import project and get its id 
     */
    const projectId = (await Project.create({ name: project.name, createdBy: user, users: [user] }).save()).id;
    // Import all images
    this._logger.log("1 - Import image into Database");
    for (const img of images)
      await Image.create({...img, project: new Project(projectId)}).save();
    
    /**
     * Create a tag map for corresponding new id to old id 
     */
    this._logger.log("2 - Import tags into Database");
    const tagMap = new Map<number, Tag>();
    for (const tag of tags) {
      tagMap.set(tag.id, await Tag.create({
        ...tag,
        id: null,
        createdBy: user,
        project: new Project(projectId),
      }).save());
    }
    
    /** 
     * Create docs with the new tag list for the docs 
     */
    this._logger.log("3 - Import documents into Database");
    await createQueryBuilder(Document).insert().values(docs.map(doc => Document.create({
      ...doc,
      id: null,
      createdBy: user,
      project: new Project(projectId),  
      tags: doc.tags?.map(oldTag => tagMap.get(oldTag.id))
    }))).execute();
    
    /** 
     * Create Blueprints and map the new ids 
     */
    this._logger.log("4 - Import blueprints into Database");
    const blueprintMap = new Map<number, Blueprint>();
    for (const blueprint of blueprints) {
      blueprintMap.set(blueprint.id, await Blueprint.create({
        ...blueprint,
        id: null,
        createdBy: user,
        project: new Project(projectId),
        tags: blueprint.tags?.map(oldTag => tagMap.get(oldTag.id))
      }).save());
    }

    /** 
     * Create nodes with the mapped blueprint ids 
     */
    this._logger.log("5 - Import blueprint nodes into Database");
    const nodeMap = new Map<number, number>();
    for (const node of nodes) {
      nodeMap.set(node.id, (await Node.create({
        ...node,
        id: null,
        createdBy: user,
        blueprint: blueprintMap.get(node.blueprintId),
        tags: node.tags?.map(oldTag => tagMap.get(oldTag.id))
      }).save()).id);
    }

    /** 
     * Create relationships with the mapped blueprint ids 
     */
    this._logger.log("6 - Import blueprint relationships into Database")
    await createQueryBuilder(Relationship).insert().values(relationships.map(rel => Relationship.create({
      ...rel,
      id: null,
      blueprint: blueprintMap.get(rel.blueprintId),
      childId: nodeMap.get(rel.childId),
      parentId: nodeMap.get(rel.parentId)
    }))).execute();

    /** 
     * Importing the images buffer 
     */
    this._logger.log("6 - Importing buffer images into filesystem");
    for (const img of zip.getEntries().filter(el => el.comment === "image_dir"))
      await this._imageManager.writeImage(img.getData(), img.name);
  }
}
