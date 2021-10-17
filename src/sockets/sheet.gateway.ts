import { WriteElementIn, RenameElementIn } from './models/in/element.in';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User } from 'src/models/user/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { removeRoom } from 'src/utils/socket.util';
import { getCustomRepository } from 'typeorm';
import { GetProject } from 'src/decorators/project.decorator';
import { GetUserId } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { UseGuards } from '@nestjs/common';
import { SocketService } from 'src/services/socket.service';
import { SheetRepository } from 'src/models/sheet/sheet.repository';
import { Sheet } from 'src/models/sheet/sheet.entity';
import { Flags } from './flags.enum';
import { CloseElementOut, ElementStore, OpenElementOut, SendElementOut, WriteElementOut } from './models/out/element.out';

@WebSocketGateway({ path: "/dash" })
@UseGuards(UserGuard)
export class sheetsGateway implements OnGatewayInit {

  @WebSocketServer() server: Server;

  private _sheetRepo: SheetRepository;

  constructor(
    private readonly _logger: AppLogger,
    private readonly _socketService: SocketService,
  ) { }

  public afterInit(_server: Server) {
    this._sheetRepo = getCustomRepository(SheetRepository);
  }



  /**
   * Triggered when someone open a element, everyone in the projec is triggered
   * If there is no elementId the sheet is created
   * Create a new room for only this element
   * Send the content of the sheet to the user
   */
   @SubscribeMessage(Flags.OPEN_SHEET)
   public async openelement(@ConnectedSocket() client: Socket, @MessageBody() [reqId, elementId]: [string, number?], @GetUserId() userId: string, @GetProject() projectId: number) {
     let element: Sheet;
     if (elementId) {
       this._logger.log("Client opened element", elementId);
       element = await this._sheetRepo.getOne(elementId);
     } else {
       this._logger.log("Client created element");
       element = await this._sheetRepo.post({
         title: "Nouveau sheet",
         projectId,
         lastEditor: new User(userId),
         createdBy: new User(userId),
       });
     }
     if (!element)
       return;
     const [lastUpdateId, content] = await this._socketService.sheetCache.registerElement(new ElementStore(element.id));
     element.content = content;
     client.emit(Flags.SEND_SHEET, new SendElementOut(element, lastUpdateId, reqId));
     client.join("element-" + element.id);
     delete element.content;
     client.broadcast.to("project-" + projectId).emit(Flags.OPEN_SHEET, new OpenElementOut(userId, element));
   }
 
   /**
    * Triggered when someone close a element, everyone in the project is triggered
    * Remove the user from the element room
    * If there everyone has closed the room then the cache is cleared
    */
   @SubscribeMessage(Flags.CLOSE_SHEET)
   public closeelement(@ConnectedSocket() client: Socket, @MessageBody() elementId: number, @GetUserId() userId: string, @GetProject() projectId: string) {
 
     this._logger.log("Client closed element", elementId);
     const roomLength = Object.keys(this.server.sockets.adapter.rooms["element-" + elementId]?.sockets || {}).length;
     this._logger.log("Clients in element :", roomLength);
     if (roomLength <= 1)
       this._socketService.sheetCache.unregisterElement(elementId);
     client.leave("element-" + elementId);
     this.server.to("project-" + projectId).emit(Flags.CLOSE_SHEET, new CloseElementOut(userId, elementId));
   }
 
   /**
    * Triggerred when someone write in a element
    * We get the last client update id and we set it
    * The element is updated via the cache service
    */
   @SubscribeMessage(Flags.WRITE_SHEET)
   public async writeelement(@MessageBody() body: WriteElementIn, @GetUserId() userId: string) {
     //We set the new update for this specific user;
     this._socketService.sheetCache.getLastUpdateElement(body.elementId).set(userId, body.clientUpdateId);
 
     const [updateId, changes] = this._socketService.sheetCache.updateElement(body);
     const userUpdates = this._socketService.sheetCache.getLastUpdateElement(body.elementId);
     for (const clientId of Object.keys(this.server.sockets.adapter.rooms["element-" + body.elementId].sockets)) {
       const client = this.server.sockets.connected[clientId];
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
   public async renameelement(@ConnectedSocket() client: Socket, @MessageBody() body: RenameElementIn, @GetProject() project: string) {
     if (body.title?.length == 0)
       body.title = "Nouveau sheet";
     client.broadcast.to("project-" + project).emit(Flags.RENAME_SHEET, body);
     await this._sheetRepo.rename(body.elementId, body.title || "Nouveau sheet");
   }
 
 
   @SubscribeMessage(Flags.REMOVE_SHEET)
   public async removeelement(@ConnectedSocket() client: Socket, @MessageBody() elementId: number, @GetProject() projectId: string) {
     this._logger.log("Client remove element", elementId);
     await this._sheetRepo.removeById(elementId);
     client.broadcast.to("project-" + projectId).emit(Flags.REMOVE_SHEET, elementId);
     removeRoom(this.server, "element-" + elementId);
     this._socketService.sheetCache.unregisterElement(elementId);
   }
}