import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { User } from 'src/models/user/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';

export const GetUser = createParamDecorator(async (data: GetUserOptions | null, ctx: ExecutionContext): Promise<User> => {
  const userId: string = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest().headers.user : ctx.switchToWs().getClient().handshake.headers.user;
  if (data?.joinProjects)
    return await User.findOne(userId, { relations: ["projects"], select: ["id", 'name'] });
  else
    return await User.findOne(userId, { select: ["id", "name"]});
});

export const GetUserId = createParamDecorator((data: void, ctx: ExecutionContext): string => {
  if (ctx.getType() === 'ws')
    return ctx.switchToWs().getClient().handshake.headers.user;
  else
    return ctx.switchToHttp().getRequest().headers.user;
});

export interface GetUserOptions {
  joinProjects: boolean;
}