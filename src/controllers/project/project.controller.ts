import { Relationship } from '../../models/relationship/relationship.entity';
import { User } from '../../models/user/user.entity';
import { Image } from '../../models/image/image.entity';
import { Node } from '../../models/node/node.entity';
import { createQueryBuilder } from 'typeorm';
import { ExportService } from './../../services/export.service';
import { Tag } from '../../models/tag/tag.entity';
import { Project } from '../../models/project/project.entity';
import { ImageService } from './../../services/image.service';
import { Document } from 'src/models/document/document.entity';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { GetUser } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { AppLogger } from 'src/utils/app-logger.util';
import { ProjectAddDto } from './project-add.dto';
import { ProjectUserDto } from './project-user.dto';
import * as AdmZip from "adm-zip";
import { v4 as uuid } from "uuid";
import { FileInterceptor } from '@nestjs/platform-express';
import { Blueprint } from 'src/models/blueprint/blueprint.entity';
import { SocketService } from 'src/services/socket.service';
import { Sheet } from 'src/models/sheet/sheet.entity';
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
    if (await Project.findOne({ where: { name: body.name } }))
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
    project = await Project.findOne({ where: { id: project.id }, relations: ["users"] });
    project.users.push(await User.findOne({ where: { id: body.userId } }));
    return await project.save();
  }

  @Get("/:id")
  async getProject(@Param("id") id: number, @GetUser({ joinProjects: true }) user: User): Promise<Project> {
    return Project.createQueryBuilder('project')
      .where('project.id = :id', { id, user })
      .leftJoinAndSelect('project.users', 'user')
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .leftJoinAndSelect('project.tags', 'tag')
      .leftJoinAndSelect('project.documents', 'documents')
      .leftJoinAndSelect('documents.tags', 'documentTag')
      .leftJoinAndSelect('documents.lastEditor', 'documentLastEditor')
      .leftJoinAndSelect('documents.sheets', 'documentSheets')
      .leftJoinAndSelect('project.blueprints', 'blueprints')
      .leftJoinAndSelect('blueprints.tags', 'blueprintTag')
      .leftJoinAndSelect('blueprints.lastEditor', 'blueprintLastEditor')
      .getOne();
  }

  @Delete("/:id")
  async deleteProject(@Param("id") id: number) {
    const project = new Project(id);
    await this._socketManager.sheetCache.saveElements();
    await this._socketManager.docCache.saveElements();
    for (const sheet of await Sheet.findBy({ project: { id: project.id } }))
      await sheet.remove();
    for (const document of await Document.findBy({ project: { id: project.id } }))
      await document.remove();
    for (const blueprint of await Blueprint.findBy({ project: { id: project.id } })) {
      await Node.delete({ blueprint: { id: blueprint.id } });
      await Relationship.delete({ blueprint: { id: blueprint.id } });
      await blueprint.remove();
    }
    await Tag.delete({ project: { id: project.id } });
    await Image.delete({ project: { id: project.id } });
    await Project.delete({ id });
  }

  @Get("/:id/export")
  async exportProject(@Param("id") id: number): Promise<{ id: string }> {
    this._logger.log("Exporting project", id);
    await this._socketManager.sheetCache.saveElements();
    await this._socketManager.docCache.saveElements();
    const project = await Project.findOne({ where: { id }, select: ["name", "id"] });
    const docs = await Document.find({ where: { project: { id: project.id } }, relations: ["tags"], select: ["content", "title", "id", "color"] });
    const tags = await Tag.find({ where: { project: { id: project.id } }, select: ["title", "id", "color"] });
    const images = await Image.find({ where: { project: { id: project.id } }, select: ["height", "width", "id", "size"] });
    const blueprints = await Blueprint.find({ where: { project: { id: project.id } }, select: ["id", "title", "color"], relations: ["tags", "nodes", "relationships"] });
    const sheets = await Sheet.find({ where: { project: { id: project.id } }, select: ["content", "id", "documentId", "title"] });
    // const files = await File.find({ where: { project: { id: project.id } }, select: ["mime", "path", "id"], relations: ["tags"]});
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
    zip.addFile("sheets.json", Buffer.from(JSON.stringify(sheets), "utf-8"));
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
    this._logger.log("Importing project for user:", user.name);
    const zip = new AdmZip(data.buffer);
    const project: Project = JSON.parse(zip.readFile("project.json").toString("utf-8"));
    const docs: Document[] = JSON.parse(zip.readFile("docs.json").toString("utf-8"));
    const tags: Tag[] = JSON.parse(zip.readFile("tags.json").toString("utf-8"));
    const images: Image[] = JSON.parse(zip.readFile("images.json").toString("utf-8"));
    const blueprints: Blueprint[] = JSON.parse(zip.readFile("blueprints.json").toString("utf-8"));
    const nodes: Node[] = JSON.parse(zip.readFile("nodes.json").toString("utf-8"));
    const relationships: Relationship[] = JSON.parse(zip.readFile("relationships.json").toString("utf-8"));
    const sheets: Sheet[] = zip.readFile("sheets.json") ? JSON.parse(zip.readFile("sheets.json").toString("utf-8")) : [];
    /** 
     * Import project and get its id 
     */
    const projectId = (await Project.create({ name: project.name, createdBy: user, users: [user] }).save()).id;
    // Import all images
    this._logger.log("1 - Import image into Database");
    for (const img of images)
      await Image.create({ ...img, project: new Project(projectId) }).save();

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
    const documentMap = new Map<number, Document>();
    for (const doc of docs) {
      documentMap.set(doc.id, await Document.create({
        ...doc,
        id: null,
        createdBy: user,
        lastEditor: user,
        project: new Project(projectId),
        tags: doc.tags?.map(oldTag => tagMap.get(oldTag.id))
      }).save());
    }

    /**
     * Create sheets and map ids + docs
     */
    this._logger.log("4 - Import sheets into Database");
    await Sheet.insert(sheets.map(sheet => Sheet.create({
      ...sheet,
      id: null,
      documentId: documentMap.get(sheet.documentId)?.id,
      createdBy: user,
      lastEditor: user,
      project: new Project(projectId),
    })));

    /** 
     * Create Blueprints and map the new ids 
     */
    this._logger.log("5 - Import blueprints into Database");
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
    this._logger.log("6 - Import blueprint nodes into Database");
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
    this._logger.log("7 - Import blueprint relationships into Database")
    await Relationship.insert(relationships.map(rel => Relationship.create({
      ...rel,
      id: null,
      blueprint: blueprintMap.get(rel.blueprintId),
      childId: nodeMap.get(rel.childId),
      parentId: nodeMap.get(rel.parentId)
    })));

    /** 
     * Importing the images buffer 
     */
    this._logger.log("8 - Importing buffer images into filesystem");
    for (const img of zip.getEntries().filter(el => el.comment === "image_dir"))
      await this._imageManager.writeImage(img.getData(), img.name);
  }
}
