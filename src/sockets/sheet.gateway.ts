import { WriteElementIn, RenameElementIn } from './models/in/element.in';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User } from 'src/models/user/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { GetProject } from 'src/decorators/project.decorator';
import { GetUserId } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { OnApplicationBootstrap, UseGuards } from '@nestjs/common';
import { SocketService } from 'src/services/socket.service';
import { SheetRepository } from 'src/models/sheet/sheet.repository';
import { Sheet } from 'src/models/sheet/sheet.entity';
import { Flags } from './flags.enum';
import { CloseElementOut, ElementStore, OpenElementOut, SendElementOut, WriteElementOut } from './models/out/element.out';
import { Document } from 'src/models/document/document.entity';
import { OpenSheetIn } from './models/in/sheet.in';
import { InjectRepository } from '@nestjs/typeorm';

@WebSocketGateway({ path: "/dash", cors: true })
@UseGuards(UserGuard)
export class SheetGateway {

  @WebSocketServer() server: Server;

  constructor(
    private readonly _logger: AppLogger,
    private readonly _socketService: SocketService,
    @InjectRepository(SheetRepository)
    private readonly _sheetRepo: SheetRepository,
  ) { }

  /**
   * Triggered when someone open a element, everyone in the projec is triggered
   * If there is no elementId the sheet is created
   * Create a new room for only this element
   * Send the content of the sheet to the user
   */
  @SubscribeMessage(Flags.OPEN_SHEET)
  public async openSheet(@ConnectedSocket() client: Socket, @MessageBody() packet: OpenSheetIn, @GetUserId() userId: string, @GetProject() projectId: number) {
    let element: Sheet;
    if (packet.elementId) {
      this._logger.log("Client opened element", packet.elementId);
      element = await this._sheetRepo.getOne(packet.elementId);
    } else {
      this._logger.log("Client created element");
      element = await this._sheetRepo.post({
        title: packet.title || "Nouveau sheet",
        projectId,
        document: new Document(packet.documentId),
        lastEditor: new User(userId),
        createdBy: new User(userId),
        content: "",
      });
    }
    if (!element)
      return;
    const [lastUpdateId, content] = await this._socketService.sheetCache.registerElement(new ElementStore(element.id));
    element.content = content;
    client.emit(Flags.SEND_SHEET, new SendElementOut(element, lastUpdateId, packet.reqId));
    client.join("sheet-" + element.id);
    delete element.content;
    client.broadcast.to("project-" + projectId).emit(Flags.OPEN_SHEET, new OpenElementOut(userId, element));
  }

  /**
   * Triggered when someone close a element, everyone in the project is triggered
   * Remove the user from the element room
   * If there everyone has closed the room then the cache is cleared
   */
  @SubscribeMessage(Flags.CLOSE_SHEET)
  public closeSheet(@ConnectedSocket() client: Socket, @MessageBody() elementId: number, @GetUserId() userId: string, @GetProject() projectId: string) {

    this._logger.log("Client closed element", elementId);
    const roomLength = Object.keys(this.server.sockets.adapter.rooms["sheet-" + elementId]?.sockets || {}).length;
    this._logger.log("Clients in sheet :", roomLength);
    if (roomLength <= 1)
      this._socketService.sheetCache.unregisterElement(elementId);
    client.leave("sheet-" + elementId);
    this.server.to("project-" + projectId).emit(Flags.CLOSE_SHEET, new CloseElementOut(userId, elementId));
  }

  /**
   * Triggerred when someone write in a element
   * We get the last client update id and we set it
   * The element is updated via the cache service
   */
  @SubscribeMessage(Flags.WRITE_SHEET)
  public async writeSheet(@MessageBody() body: WriteElementIn, @GetUserId() userId: string) {
    //We set the new update for this specific user;
    this._socketService.sheetCache.getLastUpdateElement(body.elementId).set(userId, body.clientUpdateId);

    const [updateId, changes] = this._socketService.sheetCache.updateElement(body);
    const userUpdates = this._socketService.sheetCache.getLastUpdateElement(body.elementId);
    for (const client of this.server.of("sheet-" + body.elementId).sockets.values()) {
      client.emit(Flags.WRITE_SHEET, new WriteElementOut(
        body.elementId,
        userId,
        updateId,
        changes,
        userUpdates.get(this._socketService.sockets.get(client.id)) || 0
      ));
    }
  }

  @SubscribeMessage(Flags.RENAME_SHEET)
  public async renameSheet(@ConnectedSocket() client: Socket, @MessageBody() body: RenameElementIn, @GetProject() project: string) {
    if (body.title?.length == 0)
      body.title = "Nouveau sheet";
    client.broadcast.to("project-" + project).emit(Flags.RENAME_SHEET, body);
    await this._sheetRepo.rename(body.elementId, body.title || "Nouveau sheet");
  }


  @SubscribeMessage(Flags.REMOVE_SHEET)
  public async removeSheet(@ConnectedSocket() client: Socket, @MessageBody() [elementId, documentId]: [number, number], @GetProject() projectId: string) {
    this._logger.log("Client remove element", elementId);
    await this._sheetRepo.removeById(elementId);
    client.broadcast.to("project-" + projectId).emit(Flags.REMOVE_SHEET, [elementId, documentId]);
    this.server.socketsLeave("sheet-" + elementId);
    this._socketService.sheetCache.unregisterElement(elementId);
  }
}