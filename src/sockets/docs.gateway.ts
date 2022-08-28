import { CursorDocumentIn } from './models/in/document.in';
import { WriteElementIn, RenameElementIn, ColorElementIn } from './models/in/element.in';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Document } from 'src/models/document/document.entity';
import { User } from 'src/models/user/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { Flags } from './flags.enum';
import { getCustomRepository } from 'typeorm';
import { GetProject } from 'src/decorators/project.decorator';
import { GetUserId } from 'src/decorators/user.decorator';
import { DocumentRepository } from 'src/models/document/document.repository';
import { UserGuard } from 'src/guards/user.guard';
import { UseGuards } from '@nestjs/common';
import { SocketService } from 'src/services/socket.service';
import { CloseElementOut, ElementStore, OpenElementOut, SendElementOut, WriteElementOut } from './models/out/element.out';
import { CursorDocumentOut } from './models/out/document.out';
import { AddTagElementIn, RemoveTagElementIn } from './models/in/tag.in';
import { AddTagElementOut } from './models/out/tag.model';
import { InjectRepository } from '@nestjs/typeorm';

@WebSocketGateway({ path: "/dash", cors: true })
@UseGuards(UserGuard)
export class DocsGateway {

  @WebSocketServer() server: Server;


  constructor(
    private readonly _logger: AppLogger,
    private readonly _socketService: SocketService,
    @InjectRepository(DocumentRepository)
    private readonly _documentRepo: DocumentRepository,
  ) { }

  /**
   * Triggered when someone open a doc, everyone in the projec is triggered
   * If there is no docId the document is created
   * Create a new room for only this doc
   * Send the content of the document to the user
   */
  @SubscribeMessage(Flags.OPEN_DOC)
  public async openDoc(@ConnectedSocket() client: Socket, @MessageBody() [reqId, docId]: [string, number?], @GetUserId() userId: string, @GetProject() projectId: number) {
    let doc: Document;
    if (docId) {
      this._logger.log("Client opened doc", docId);
      doc = await this._documentRepo.getOne(docId);
    } else {
      this._logger.log("Client created doc");
      doc = await this._documentRepo.post({
        title: "Nouveau document",
        projectId,
        lastEditor: new User(userId),
        createdBy: new User(userId),
      });
      doc.tags = [];
    }
    if (!doc)
      return;
    const [lastUpdateId, content] = await this._socketService.docCache.registerElement(new ElementStore(doc.id));
    doc.content = content;
    client.emit(Flags.SEND_DOC, new SendElementOut(doc, lastUpdateId, reqId));
    client.join("doc-" + doc.id);
    delete doc.content;
    client.broadcast.to("project-" + projectId).emit(Flags.OPEN_DOC, new OpenElementOut(userId, doc));
  }

  /**
   * Triggered when someone close a doc, everyone in the project is triggered
   * Remove the user from the doc room
   * If there everyone has closed the room then the cache is cleared
   */
  @SubscribeMessage(Flags.CLOSE_DOC)
  public closeDoc(@ConnectedSocket() client: Socket, @MessageBody() docId: number, @GetUserId() userId: string, @GetProject() projectId: string) {

    this._logger.log("Client closed doc", docId);
    const roomLength = Object.keys(this.server.sockets.adapter.rooms["doc-" + docId]?.sockets || {}).length;
    this._logger.log("Clients in doc :", roomLength);
    if (roomLength <= 1)
      this._socketService.docCache.unregisterElement(docId);
    client.leave("doc-" + docId);
    this.server.to("project-" + projectId).emit(Flags.CLOSE_DOC, new CloseElementOut(userId, docId));
  }

  /**
   * Triggerred when someone write in a doc
   * We get the last client update id and we set it
   * The doc is updated via the cache service
   */
  @SubscribeMessage(Flags.WRITE_DOC)
  public async writeDoc(@MessageBody() body: WriteElementIn, @GetUserId() userId: string) {
    //We set the new update for this specific user;
    this._socketService.docCache.getLastUpdateElement(body.elementId).set(userId, body.clientUpdateId);

    const [updateId, changes] = this._socketService.docCache.updateElement(body);
    const userUpdates = this._socketService.docCache.getLastUpdateElement(body.elementId);
    for (const client of this.server.of(`doc-${body.elementId}`).sockets.values()) {
      client.emit(Flags.WRITE_DOC, new WriteElementOut(
        body.elementId,
        userId,
        updateId,
        changes,
        userUpdates.get(this._socketService.sockets.get(client.id)) || 0
      ));
    }
  }

  @SubscribeMessage(Flags.RENAME_DOC)
  public async renameDoc(@ConnectedSocket() client: Socket, @MessageBody() body: RenameElementIn, @GetProject() project: string) {
    if (body.title?.length == 0)
      body.title = "Nouveau document";
    client.broadcast.to("project-" + project).emit(Flags.RENAME_DOC, body);
    await this._documentRepo.rename(body.elementId, body.title || "Nouveau document");
  }

  /**
   * Triggerred when someone move its cursor, everyone who opened the doc is triggered
   */
  @SubscribeMessage(Flags.CURSOR_DOC)
  public async cursorDoc(@MessageBody() body: CursorDocumentIn, @GetUserId() userId: string) {
    this.server.to("doc-" + body.docId).emit(Flags.CURSOR_DOC, new CursorDocumentOut(body, userId));
  }

  @SubscribeMessage(Flags.REMOVE_DOC)
  public async removeDoc(@ConnectedSocket() client: Socket, @MessageBody() docId: number, @GetProject() projectId: string) {
    this._logger.log("Client remove doc", docId);
    await this._documentRepo.removeById(docId);
    client.broadcast.to("project-" + projectId).emit(Flags.REMOVE_DOC, docId);
    this.server.socketsLeave("doc-" + docId);
    this._socketService.docCache.unregisterElement(docId);
  }

  @SubscribeMessage(Flags.COLOR_DOC)
  public async colorDoc(@ConnectedSocket() client: Socket, @MessageBody() body: ColorElementIn, @GetProject() projectId: string) {
    this._logger.log("Client color doc", body.elementId);
    await this._documentRepo.updateColor(body.elementId, body.color);
    client.broadcast.to("project-" + projectId).emit(Flags.COLOR_DOC, body);
  }

  @SubscribeMessage(Flags.TAG_ADD_DOC)
  public async addTagDoc(@ConnectedSocket() client: Socket, @MessageBody() body: AddTagElementIn, @GetUserId() userId: string, @GetProject() projectId: number) {
    this._logger.log("Client add tag to doc", body.elementId, body.title);

    const { tag } = await this._documentRepo.addTag(body.elementId, body.title, projectId, userId);
    client.broadcast.to("project-" + projectId).emit(Flags.TAG_ADD_DOC, new AddTagElementOut(body.elementId, tag));
  }

  @SubscribeMessage(Flags.TAG_REMOVE_DOC)
  public async removeTagDoc(@ConnectedSocket() client: Socket, @MessageBody() body: RemoveTagElementIn, @GetProject() projectId: number) {
    this._logger.log("Client removed tag to doc", body.elementId, body.title);
    await this._documentRepo.removeTag(body.elementId, body.title, projectId);
    client.broadcast.to("project-" + projectId).emit(Flags.TAG_REMOVE_DOC, body);
  }

}