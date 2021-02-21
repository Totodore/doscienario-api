import { CacheService } from './../services/cache.service';
import { UseGuards } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { title } from 'process';
import { Server, Socket } from 'socket.io';
import { UserRes } from 'src/controllers/user/user.res';
import { Document, DocumentTypes } from 'src/models/document.entity';
import { File } from 'src/models/file.entity';
import { Project } from 'src/models/project.entity';
import { Tag } from 'src/models/tag.entity';
import { User } from 'src/models/user.entity';
import { JwtService } from 'src/services/jwt.service';
import { AppLogger } from 'src/utils/app-logger.util';
import { removeRoom } from 'src/utils/socket.util';
import { Flags } from './flags.enum';
import { AddTagDocumentReq, AddTagDocumentRes, CloseDocumentRes, CursorDocumentReq, CursorDocumentRes, DocumentStore, OpenDocumentRes, RemoveTagDocumentReq, WriteDocumentReq, WriteDocumentRes, SendDocumentRes } from './models/document.model';
import { CreateFileReq, RenameFileReq } from './models/file.model';
import { ColorTagReq, RenameTagReq, TagAddFile, TagRemoveFile } from './models/tag.model';

@WebSocketGateway({ path: "/dash" })
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

  @WebSocketServer() server: Server;

  constructor(
    private readonly _logger: AppLogger,
    private readonly _jwt: JwtService,
    private readonly _cache: CacheService
  ) {}

  afterInit(server: Server) {
    this._logger.log(`Websocket: namespace 'dash' initialized`);
  }

  handleConnection(client: Socket) {
    const data = this.getData(client);
    this._logger.log("New client connected ", data.user, data.project);
    client.join(data.project.toString());
    this.server.to(data.project.toString()).emit(Flags.OPEN_PROJECT, data.user);
  }

  handleDisconnect(client: Socket) {
    const data = this.getData(client);
    this._logger.log("Client disconnect", data.user, data.project);
    this.server.to(data.project.toString()).emit(Flags.CLOSE_PROJECT, data.user);
  }

  /**
   * Triggered when someone open a doc, everyone in the projec is triggered
   * If there is no docId the document is created
   * Create a new room for only this doc
   * Send the content of the document to the user
   */
  @SubscribeMessage(Flags.OPEN_DOC)
  async openDoc(client: Socket, docId: string) {
    const data = this.getData(client);
    let doc: Document;
    if (docId) {
      this._logger.log("Client opened doc", docId);
      doc = await Document.findOne(docId, {
        select: [
          "content",
          "id",
          "createdBy",
          "createdDate",
          "lastEditing",
          'lastEditor',
          'title'
        ],
        relations: ["createdBy", "lastEditor"]
      });
    } else {
      this._logger.log("Client created doc");
      doc = await Document.create({
        type: DocumentTypes.OTHERS,
        project: new Project(data.project),
        lastEditor: new User(data.user),
        createdBy: new User(data.user)
      }).save();
    }
    const lastUpdateId = await this._cache.registerDoc(new DocumentStore(doc.id));
    
    client.broadcast.to(data.project.toString()).emit(Flags.OPEN_DOC, new OpenDocumentRes(data.user, doc.id));
    client.emit(Flags.SEND_DOC, new SendDocumentRes(doc, lastUpdateId));
    client.join(doc.id.toString());
  }

  /**
   * Triggered when someone close a doc, everyone in the project is triggered
   * Remove the user from the doc room
   * If there everyone has closed the room then the cache is cleared
   */
  @SubscribeMessage(Flags.CLOSE_DOC)
  closeDoc(client: Socket, docId: string) {
    const data = this.getData(client);

    this._logger.log("Client closed doc", docId);
    const roomLength = Object.keys(this.server.sockets.adapter.rooms[docId].sockets).length;
    this._logger.log("Clients in doc :", roomLength);
    if (roomLength <= 1)
      this._cache.unregisterDoc(parseInt(docId));
    client.leave(docId);
    this.server.to(data.project.toString()).emit(Flags.CLOSE_DOC, new CloseDocumentRes(data.user, parseInt(docId)))
  }

  /**
   * Triggerred when someone write in a doc, everyone who openeed the doc is triggered
   * The doc is updated via the cache service
   */
  @SubscribeMessage(Flags.WRITE_DOC)
  async writeDoc(client: Socket, body: WriteDocumentReq) {
    const data = this.getData(client);
    
    const [updateId, changes] = this._cache.updateDoc(body);
    this.server.to(body.docId.toString()).emit(Flags.WRITE_DOC, new WriteDocumentRes(
      body.docId,
      data.user,
      updateId,
      changes
    ));
  }

  /**
   * Triggerred when someone move its cursor, everyone who opened the doc is triggered
   */
  @SubscribeMessage(Flags.CURSOR_DOC)
  async cursorDoc(client: Socket, body: CursorDocumentReq) {
    const data = this.getData(client);

    this.server.to(body.docId.toString()).emit(Flags.CURSOR_DOC, new CursorDocumentRes(body, data.user));
  }

  @SubscribeMessage(Flags.REMOVE_DOC)
  async removeDoc(client: Socket, docId: string) {
    const data = this.getData(client);
    this._logger.log("Client remove doc", docId);

    await Document.delete(docId);
    this.server.to(docId).emit(Flags.REMOVE_DOC, docId);
    removeRoom(this.server, docId);
  }

  @SubscribeMessage(Flags.TAG_ADD_DOC)
  async addTagDoc(client: Socket, body: AddTagDocumentReq) {
    this._logger.log("Client add tag to doc", body.docId, body.tagId);

    const doc = await Document.findOne(body.docId);
    doc.tags.push(new Tag(body.tagId));
    await doc.save();
    this.server.to(body.docId.toString()).emit(Flags.TAG_ADD_DOC, body);
  }

  @SubscribeMessage(Flags.TAG_REMOVE_DOC)
  async removeTagDoc(client: Socket, body: RemoveTagDocumentReq) {
    this._logger.log("Client removed tag to doc", body.docId, body.tagId);

    const doc = await Document.findOne(body.docId);
    doc.tags = doc.tags.filter(el => el.id != body.tagId);
    await doc.save();
    this.server.to(body.docId.toString()).emit(Flags.TAG_REMOVE_DOC, body);
  }

  @SubscribeMessage(Flags.CREATE_TAG)
  async createTag(client: Socket, name: string) {
    const data = this.getData(client);
    this._logger.log("Client create tag", name);

    if (await Tag.exists<Tag>({ where: { projectId: data.project, name: name.toLowerCase() } }))
      throw new WsException("Tag already exist");

    await Tag.create({ createdById: data.user, projectId: data.project, name: name.toLowerCase() }).save();
    this.server.to(data.project.toString()).emit(Flags.CREATE_TAG, name);
  }

  @SubscribeMessage(Flags.REMOVE_TAG)
  async removeTag(client: Socket, tagId: string) {
    const data = this.getData(client);
    this._logger.log("Client remove tag");

    await Tag.delete(tagId);
    this.server.to(data.project.toString()).emit(Flags.REMOVE_TAG, tagId);
  }

  @SubscribeMessage(Flags.RENAME_TAG)
  async updateTag(client: Socket, body: RenameTagReq) {
    const data = this.getData(client);
    this._logger.log("Client rename tag");

    await Tag.update(body.id, { name: body.name });
    this.server.to(data.project.toString()).emit(Flags.RENAME_TAG, body);
  }

  @SubscribeMessage(Flags.COLOR_TAG)
  async colorTag(client: Socket, body: ColorTagReq) {
    const data = this.getData(client);
    this._logger.log("Client update color tag");

    await Tag.update(body.id, { color: body.color.toString(16) });
    this.server.to(data.project.toString()).emit(Flags.COLOR_TAG, body);
  }

  @SubscribeMessage(Flags.CREATE_FILE)
  async createFile(client: Socket, body: CreateFileReq) {
    const data = this.getData(client);
    this._logger.log("Client create file");
    const file = await File.create({
      id: body.id,
      mime: body.mime,
      path: body.path,
      createdById: data.user,
      size: body.size,
      projectId: data.project,
    }).save();
    this.server.to(data.project.toString()).emit(Flags.CREATE_FILE, file);
  }

  @SubscribeMessage(Flags.GET_FILE)
  async getDirInfos(client: Socket, path: string) {
    const files = await File.query(`SELECT * FROM file WHERE path CONTAINS ${path}`);
    client.emit(Flags.GET_FILE, files);
  }

  @SubscribeMessage(Flags.RENAME_FILE)
  async renameFile(client: Socket, body: RenameFileReq) {
    const data = this.getData(client);
    await File.update(body.id, { path: body.path });
    this.server.to(data.project.toString()).emit(Flags.RENAME_FILE, body);
  }

  @SubscribeMessage(Flags.TAG_ADD_FILE)
  async addTagFile(client: Socket, body: TagAddFile) {
    const data = this.getData(client);
    const file = await File.findOne(body.fileId);
    file.tags.push(new Tag(body.tagId));
    file.save();
    this.server.to(data.project.toString()).emit(Flags.TAG_ADD_FILE, body);
  }

  @SubscribeMessage(Flags.TAG_REMOVE_FILE)
  async removeTagFile(client: Socket, body: TagRemoveFile) {
    const data = this.getData(client);
    const file = await File.findOne(body.fileId);
    file.tags = file.tags.filter(tag => tag.id != body.tagId);
    await file.save();
    this.server.to(data.project.toString()).emit(Flags.TAG_REMOVE_FILE, body);
  }

  @SubscribeMessage(Flags.RENAME_PROJECT)
  async renameProject(client: Socket, name: string) {
    const data = this.getData(client);
    await Project.update(data.project, { name });
    console.log(this.server.to(data.project.toString()));
    this.server.to(data.project.toString()).emit(Flags.RENAME_PROJECT, name);
  }

  @SubscribeMessage(Flags.ADD_USER_PROJECT)
  async addUserProject(client: Socket, user: UserRes) {
    const data = this.getData(client);
    const project = await Project.findOne(data.project, { relations: ["users"] });
    project.users.push(await User.findOne(user.id));
    await project.save();
    this.server.to(data.project.toString()).emit(Flags.ADD_USER_PROJECT, user);
  }

  @SubscribeMessage(Flags.REMOVE_USER_PROJECT)
  async removeUserProject(client: Socket, user: UserRes) {
    const data = this.getData(client);
    const project = await Project.findOne(data.project, { relations: ["users"] });
    project.users.slice(project.users.indexOf(await User.findOne(user.id)), 1);
    await project.save();
    this.server.to(data.project.toString()).emit(Flags.REMOVE_USER_PROJECT, user);
  }


  getData(client: Socket): DataInterface {
    if (!this._jwt.verify(client.handshake.query.authorization))
      throw new WsException("Forbidden");
    return {
      user: this._jwt.getUserId(client.handshake.query.authorization?.toString())?.toString(),
      project: parseInt(client.handshake.query.project?.toString())
    }
  }

}

interface DataInterface {
  user: string;
  project: number
}