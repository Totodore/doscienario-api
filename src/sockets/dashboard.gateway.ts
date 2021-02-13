import { UseGuards } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsUserGuard } from 'src/guards/ws-user.guard';
import { AppLogger } from 'src/utils/app-logger.util';
import { Flags } from './flags.enum';

@WebSocketGateway({ path: "dash" })
@UseGuards(WsUserGuard)
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

  @WebSocketServer() server: Server;

  constructor(
    private readonly _logger: AppLogger
  ) {}

  afterInit(server: Server) {
    this._logger.log(`Websocket: namespace 'dash' initialized`);
  }


  handleConnection(client: Socket, args: string[]) {
    this._logger.log(args);
    client.send(args);
    // client.join(project);
    // this.server.to(project).emit(Flags.OPEN_PROJECT, user);
  }

  handleDisconnect(client: Socket) {
    client.leaveAll();
    this.server.to(client.handshake.query.project).emit(Flags.CLOSE_PROJECT, client.handshake.headers.user);
  }

  @SubscribeMessage(Flags.OPEN_DOC)
  handleMessage(client: Socket, payload: string) {
  }

}
