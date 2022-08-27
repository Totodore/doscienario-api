import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';

export const GetProject = createParamDecorator(async (data: void, ctx: ExecutionContext) => {
  const client: Socket = ctx.switchToWs().getClient();
  return +client.handshake.query.project;
});