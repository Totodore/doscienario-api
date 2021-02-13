import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { User } from 'src/models/user.entity';
import { AppLogger } from 'src/utils/app-logger.service';

export const GetUser = createParamDecorator(async (data: GetUserOptions | null, ctx: ExecutionContext): Promise<User> => {
  const userId: string = ctx.switchToHttp().getRequest().headers.user ?? ctx.switchToWs().getClient().handshake.headers.user;
  new AppLogger().log(userId);
  if (data?.joinProjects)
    return await User.findOne({ relations: ["projects"], where: { id: userId }, select: ["id", 'name'] });
  else
    return await User.findOne({ where: {id: userId}, select: ["id", "name"]});
});

export const GetUserId = createParamDecorator((data: void, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().headers.user ?? ctx.switchToWs().getClient().handshake.headers.user;
});

export interface GetUserOptions {
  joinProjects: boolean;
}