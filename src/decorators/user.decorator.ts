import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Socket } from 'socket.io';
import { User } from 'src/models/user/user.entity';
import * as jwt from "jsonwebtoken";

export const GetUser = createParamDecorator(async (data: GetUserOptions | null, ctx: ExecutionContext): Promise<User> => {
  const userId: string = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest().headers.user : ctx.switchToWs().getClient().handshake.headers.user;
  if (data?.joinProjects)
    return await User.findOne(userId, { relations: ["projects", "projects.users"], select: ["id", 'name'] });
  else
    return await User.findOne(userId, { select: ["id", "name"]});
});

export const GetUserId = createParamDecorator((data: void, ctx: ExecutionContext): string => {
  if (ctx.getType() === 'ws') {
    const client: Socket = ctx.switchToWs().getClient();
    return jwt.decode(client.handshake.query.authorization).toString();
  }
  else
    return ctx.switchToHttp().getRequest().headers.user;
});

export interface GetUserOptions {
  joinProjects: boolean;
}