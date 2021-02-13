import { UseGuards } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GetProject } from 'src/decorators/project.decorator';
import { GetUser, GetUserId } from 'src/decorators/user.decorator';
import { WsUserGuard } from 'src/guards/ws-user.guard';
import { AppLogger } from 'src/utils/app-logger.service';
import { Flags } from './flags.enum';

@WebSocketGateway(4000, { path: "dash" })
@UseGuards(WsUserGuard)
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {

  constructor(
    private readonly _logger: AppLogger
  ) {}

  @WebSocketServer() server: Server;

  handleConnection(client: Socket, @GetUserId() user: string, @GetProject() project: string) {
    this._logger.log(user, project);
    client.join(project);
    this.server.to(project).emit(Flags.OPEN_PROJECT, user);
  }

  handleDisconnect(client: Socket) {
    client.leaveAll();
    this.server.to(client.handshake.query.project).emit(Flags.CLOSE_PROJECT, client.handshake.headers.user);
  }

  @SubscribeMessage(Flags.OPEN_DOC)
  handleMessage(client: Socket, payload: string) {
  }

}
