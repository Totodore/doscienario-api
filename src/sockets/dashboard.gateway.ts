import { UseGuards } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsUserGuard } from 'src/guards/ws-user.guard';
import { Document } from 'src/models/document.entity';
import { File } from 'src/models/file.entity';
import { Tag } from 'src/models/tag.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { removeRoom } from 'src/utils/socket.util';
import { Flags } from './flags.enum';
import { AddTagDocumentReq, AddTagDocumentRes, CloseDocumentRes, CursorDocumentReq, CursorDocumentRes, OpenDocumentRes, RemoveTagDocumentReq, WriteDocumentReq, WriteDocumentRes } from './models/document.model';
import { CreateFileReq, RenameFileReq } from './models/file.model';
import { ColorTagReq, RenameTagReq, TagAddFile, TagRemoveFile } from './models/tag.model';

@WebSocketGateway({ namespace: "/dash", path: "/dash" })
@UseGuards(WsUserGuard)
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

  @WebSocketServer() server: Server;

  constructor(
    private readonly _logger: AppLogger
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
    client.leaveAll();
    this._logger.log("Client disconnect", data.user, data.project);
    this.server.to(data.project.toString()).emit(Flags.CLOSE_PROJECT, data.user);
  }

  /**
   * Triggered when someone open a doc, everyone in the projec is triggered
   * Create a new room for only this doc
   * Send the content of the document to the user
   */
  @SubscribeMessage(Flags.OPEN_DOC)
  async openDoc(client: Socket, docId: string) {
    const data = this.getData(client);

    this._logger.log("Client opened doc", docId);
    this.server.to(data.project.toString()).emit(Flags.OPEN_DOC, new OpenDocumentRes(data.user, docId));

    client.join(docId);
    client.emit(Flags.OPEN_DOC, await Document.findOne(docId, { select: ["content"] }));
  }

  /**
   * Triggered when someone close a doc, everyone in the project is triggered
   * Remove the user from the doc room
   */
  @SubscribeMessage(Flags.CLOSE_DOC)
  closeDoc(client: Socket, docId: string) {
    const data = this.getData(client);

    this._logger.log("Client closed doc", docId);

    client.leave(docId);
    this.server.to(data.project.toString()).emit(Flags.CLOSE_DOC, new CloseDocumentRes(data.user, docId))
  }

  /**
   * Triggerred when someone write in a doc, everyone who openeed the doc is triggered
   * THe doc is updated through a sql request
   */
  @SubscribeMessage(Flags.WRITE_DOC)
  async writeDoc(client: Socket, body: WriteDocumentReq) {
    const data = this.getData(client);

    this._logger.log("Client write doc", body.docId);
    await Document.query(`UPDATE document SET content = INSERT(content, ${body.pos}, 0, ${body.content}) WHERE id = ${body.docId}`);
    this.server.to(body.docId.toString()).emit(Flags.WRITE_DOC, new WriteDocumentRes(body, data.user));
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
    this.server.of(docId).emit(Flags.REMOVE_DOC, docId);
    removeRoom(this.server, docId);
  }

  @SubscribeMessage(Flags.TAG_ADD_DOC)
  async addTagDoc(client: Socket, body: AddTagDocumentReq) {
    this._logger.log("Client add tag to doc", body.docId, body.tagId);

    const doc = await Document.findOne(body.docId);
    doc.tags.push(new Tag(body.tagId));
    await doc.save();
    this.server.of(body.docId.toString()).emit(Flags.TAG_ADD_DOC, body);
  }

  @SubscribeMessage(Flags.TAG_REMOVE_DOC)
  async removeTagDoc(client: Socket, body: RemoveTagDocumentReq) {
    this._logger.log("Client removed tag to doc", body.docId, body.tagId);

    const doc = await Document.findOne(body.docId);
    doc.tags = doc.tags.filter(el => el.id != body.tagId);
    await doc.save();
    this.server.of(body.docId.toString()).emit(Flags.TAG_REMOVE_DOC, body);
  }

  @SubscribeMessage(Flags.CREATE_TAG)
  async createTag(client: Socket, name: string) {
    const data = this.getData(client);
    this._logger.log("Client create tag", name);

    if (await Tag.exists<Tag>({ where: { projectId: data.project, name: name.toLowerCase() } }))
      throw new WsException("Tag already exist");

    await Tag.create({ createdById: data.user, projectId: data.project, name: name.toLowerCase() }).save();
    this.server.of(data.project.toString()).emit(Flags.CREATE_TAG, name);
  }

  @SubscribeMessage(Flags.REMOVE_TAG)
  async removeTag(client: Socket, tagId: string) {
    const data = this.getData(client);
    this._logger.log("Client remove tag");

    await Tag.delete(tagId);
    this.server.of(data.project.toString()).emit(Flags.REMOVE_TAG, tagId);
  }

  @SubscribeMessage(Flags.RENAME_TAG)
  async updateTag(client: Socket, body: RenameTagReq) {
    const data = this.getData(client);
    this._logger.log("Client rename tag");

    await Tag.update(body.id, { name: body.name });
    this.server.of(data.project.toString()).emit(Flags.RENAME_TAG, body);
  }

  @SubscribeMessage(Flags.COLOR_TAG)
  async colorTag(client: Socket, body: ColorTagReq) {
    const data = this.getData(client);
    this._logger.log("Client update color tag");

    await Tag.update(body.id, { color: body.color.toString(16) });
    this.server.of(data.project.toString()).emit(Flags.COLOR_TAG, body);
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
    this.server.of(data.project.toString()).emit(Flags.CREATE_FILE, file);
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
    this.server.of(data.project.toString()).emit(Flags.RENAME_FILE, body);
  }

  @SubscribeMessage(Flags.TAG_ADD_FILE)
  async addTagFile(client: Socket, body: TagAddFile) {
    const data = this.getData(client);
    const file = await File.findOne(body.fileId);
    file.tags.push(new Tag(body.tagId));
    file.save();
    this.server.of(data.project.toString()).emit(Flags.TAG_ADD_FILE, body);
  }

  @SubscribeMessage(Flags.TAG_REMOVE_FILE)
  async removeTagFile(client: Socket, body: TagRemoveFile) {
    const data = this.getData(client);
    const file = await File.findOne(body.fileId);
    file.tags = file.tags.filter(tag => tag.id != body.tagId);
    await file.save();
    this.server.of(data.project.toString()).emit(Flags.TAG_REMOVE_FILE, body);
  }


  getData(client: Socket): DataInterface {
    return {
      user: client.handshake.headers.user,
      project: parseInt(client.handshake.query.project)
    }
  }

}

interface DataInterface {
  user: string;
  project: number
}