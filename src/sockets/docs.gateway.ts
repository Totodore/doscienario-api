import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Document } from 'src/models/document/document.entity';
import { Project } from 'src/models/project/project.entity';
import { Tag } from 'src/models/tag/tag.entity';
import { User } from 'src/models/user/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { removeRoom } from 'src/utils/socket.util';
import { Flags } from './flags.enum';
import { AddTagDocumentReq, AddTagDocumentRes, CloseDocumentRes, CursorDocumentReq, CursorDocumentRes, DocumentStore, OpenDocumentRes, RemoveTagDocumentReq, WriteDocumentReq, WriteDocumentRes, SendDocumentRes, RenameDocumentReq } from './models/document.model';
import { createQueryBuilder, getCustomRepository, getRepository } from 'typeorm';
import { docCache } from 'src/main';
import { GetProject } from 'src/decorators/project.decorator';
import { GetUserId } from 'src/decorators/user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentRepository } from 'src/models/document/document.repository';
import { UserGuard } from 'src/guards/user.guard';
import { UseGuards } from '@nestjs/common';
import { SocketService } from 'src/services/socket.service';

@WebSocketGateway({ path: "/dash" })
@UseGuards(UserGuard)
export class DocsGateway implements OnGatewayInit {

  @WebSocketServer() server: Server;

  private _documentRepo: DocumentRepository;

  constructor(
    private readonly _logger: AppLogger,
    private readonly _socketService: SocketService,
  ) { }

  public afterInit(_server: Server) {
    this._documentRepo = getCustomRepository(DocumentRepository);
  }



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
        projectId,
        title: "Nouveau document",
        lastEditor: new User(userId),
        createdBy: new User(userId),
      });
    }
    const [lastUpdateId, content] = await docCache.registerDoc(new DocumentStore(doc.id));
    doc.content = content;
    client.emit(Flags.SEND_DOC, new SendDocumentRes(doc, lastUpdateId, reqId));
    client.join("doc-" + doc.id);
    delete doc.content;
    client.broadcast.to("project-" + projectId).emit(Flags.OPEN_DOC, new OpenDocumentRes(userId, doc));
  }

  /**
   * Triggered when someone close a doc, everyone in the project is triggered
   * Remove the user from the doc room
   * If there everyone has closed the room then the cache is cleared
   */
  @SubscribeMessage(Flags.CLOSE_DOC)
  public closeDoc(@ConnectedSocket() client: Socket, @MessageBody() docId: number, @GetUserId() userId: string, @GetProject() projectId: string) {

    this._logger.log("Client closed doc", docId);
    const roomLength = Object.keys(this.server.sockets.adapter.rooms["doc-" + docId].sockets).length;
    this._logger.log("Clients in doc :", roomLength);
    if (roomLength <= 1)
      docCache.unregisterDoc(docId);
    client.leave("doc-" + docId);
    this.server.to("project-" + projectId).emit(Flags.CLOSE_DOC, new CloseDocumentRes(userId, docId));
  }

  /**
   * Triggerred when someone write in a doc
   * We get the last client update id and we set it
   * The doc is updated via the cache service
   */
  @SubscribeMessage(Flags.WRITE_DOC)
  public async writeDoc(@MessageBody() body: WriteDocumentReq, @GetUserId() userId: string) {
    //We set the new update for this specific user;
    docCache.getLastUpdateDoc(body.docId).set(userId, body.clientUpdateId);

    const [updateId, changes] = docCache.updateDoc(body);
    const userUpdates = docCache.getLastUpdateDoc(body.docId);
    for (const clientId of Object.keys(this.server.sockets.adapter.rooms["doc-" + body.docId].sockets)) {
      const client = this.server.sockets.connected[clientId];
      client.emit(Flags.WRITE_DOC, new WriteDocumentRes(
        body.docId,
        userId,
        updateId,
        changes,
        userUpdates.get(this._socketService.sockets.get(client.id)) || 0
      ));
    }
  }

  @SubscribeMessage(Flags.RENAME_DOC)
  public async renameDoc(@ConnectedSocket() client: Socket, @MessageBody() body: RenameDocumentReq, @GetProject() project: string) {
    if (body.title?.length == 0)
      body.title = "Nouveau document";
    client.broadcast.to("project-" + project).emit(Flags.RENAME_DOC, body);
    await this._documentRepo.rename(body.docId, body.title || "Nouveau document");
  }

  /**
   * Triggerred when someone move its cursor, everyone who opened the doc is triggered
   */
  @SubscribeMessage(Flags.CURSOR_DOC)
  public async cursorDoc(@MessageBody() body: CursorDocumentReq, @GetUserId() userId: string) {
    this.server.to("doc-" + body.docId).emit(Flags.CURSOR_DOC, new CursorDocumentRes(body, userId));
  }

  @SubscribeMessage(Flags.REMOVE_DOC)
  public async removeDoc(@ConnectedSocket() client: Socket, @MessageBody() docId: number, @GetProject() projectId: string) {
    this._logger.log("Client remove doc", docId);
    await this._documentRepo.removeById(docId);
    client.broadcast.to("project-" + projectId).emit(Flags.REMOVE_DOC, docId);
    removeRoom(this.server, "doc-" + docId);
    docCache.unregisterDoc(docId);
  }

  @SubscribeMessage(Flags.TAG_ADD_DOC)
  public async addTagDoc(@ConnectedSocket() client: Socket, @MessageBody() body: AddTagDocumentReq, @GetUserId() userId: string, @GetProject() projectId: string) {
    this._logger.log("Client add tag to doc", body.docId, body.name);

    const { tag } = await this._documentRepo.addTag(body.docId, body.name, +projectId, userId);
    client.broadcast.to("project-" + projectId).emit(Flags.TAG_ADD_DOC, new AddTagDocumentRes(body.docId, tag));
  }

  @SubscribeMessage(Flags.TAG_REMOVE_DOC)
  public async removeTagDoc(@ConnectedSocket() client: Socket, @MessageBody() body: RemoveTagDocumentReq, @GetProject() projectId: string) {
    this._logger.log("Client removed tag to doc", body.docId, body.name);
    await this._documentRepo.removeTag(body.docId, body.name);
    client.broadcast.to("project-" + projectId).emit(Flags.TAG_REMOVE_DOC, body);
  }

}