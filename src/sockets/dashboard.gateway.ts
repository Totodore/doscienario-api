import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserRes } from 'src/controllers/user/user.res';
import { Project } from 'src/models/project/project.entity';
import { Tag } from 'src/models/tag/tag.entity';
import { User } from 'src/models/user/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { Flags } from './flags.enum';
import { GetUserId } from 'src/decorators/user.decorator';
import { GetProject } from 'src/decorators/project.decorator';
import { UseGuards } from '@nestjs/common';
import { UserGuard } from 'src/guards/user.guard';
import { SocketService } from 'src/services/socket.service';
import { ColorTagIn, RenameTagIn } from './models/in/tag.in';
import * as jwt from "jsonwebtoken";

@WebSocketGateway({ path: "/dash", cors: true })
@UseGuards(UserGuard)
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

  @WebSocketServer() server: Server;

  constructor(
    private readonly _logger: AppLogger,
    private readonly _socketService: SocketService,
  ) { }

  public afterInit() {
    this._logger.log(`Websocket: namespace 'dash' initialized`);
  }

  public handleConnection(@ConnectedSocket() client: Socket) {
    const userId = jwt.decode(client.handshake.query.authorization as string).toString();
    const projectId = client.handshake.query.project;
    this._logger.log("New client connected user:", userId, "project:", projectId);
    this._socketService.sockets.set(client.id, userId);
    client.join("project-"+projectId);
    this.server.to("project-"+projectId).emit(Flags.OPEN_PROJECT, userId);
  }

  public handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = jwt.decode(client.handshake.query.authorization as string).toString();
    const projectId = client.handshake.query.project;
    this._logger.log("Client disconnect", userId, projectId);
    this._socketService.sockets.delete(client.id);
    this.server.to("project-"+projectId).emit(Flags.CLOSE_PROJECT, userId);
  }

  @SubscribeMessage(Flags.CREATE_TAG)
  public async createTag(@MessageBody() tag: Tag, @GetUserId() userId: string, @GetProject() projectId: number) {
    this._logger.log("Client create tag", tag);

    if (await Tag.count<Tag>({ where: { projectId, title: tag.title.toLowerCase() } }))
      throw new WsException("Tag already exist");

    tag = await Tag.create({ createdBy: new User(userId), project: new Project(projectId), ...tag, color: tag.color }).save();
    this.server.to("project-"+projectId).emit(Flags.CREATE_TAG, tag);
  }

  @SubscribeMessage(Flags.REMOVE_TAG)
  public async removeTag(@ConnectedSocket() client: Socket, @MessageBody() tagName: string, @GetProject() projectId: number) {
    this._logger.log("Client remove tag");
    await (await Tag.findOne({ where: { title: tagName, projectId } })).remove();
    client.broadcast.to("project-"+projectId).emit(Flags.REMOVE_TAG, tagName);
  }

  @SubscribeMessage(Flags.RENAME_TAG)
  public async updateTag(@ConnectedSocket() client: Socket, @MessageBody() body: RenameTagIn, @GetProject() projectId: number) {
    this._logger.log("Client rename tag");

    await Tag.createQueryBuilder().update()
      .set({ title: body.title })
      .where({ title: body.oldTitle, projectId })
      .execute();
    client.broadcast.to("project-"+projectId).emit(Flags.RENAME_TAG, body);
  }

  @SubscribeMessage(Flags.COLOR_TAG)
  public async colorTag(@ConnectedSocket() client: Socket, @MessageBody() body: ColorTagIn, @GetProject() projectId: number) {
    this._logger.log("Client update color tag");

    await Tag.createQueryBuilder().update()
      .set({ color: body.color.replace("#", "") })
      .where({ title: body.title, projectId })
      .execute();
    client.broadcast.to("project-"+projectId).emit(Flags.COLOR_TAG, body);
  }

  // @SubscribeMessage(Flags.CREATE_FILE)
  // public async createFile(@MessageBody() body: CreateFileReq, @GetUserId() userId: string, @GetProject() projectId: string) {
  //   this._logger.log("Client create file");
  //   const file = await File.create({
  //     id: body.id,
  //     mime: body.mime,
  //     path: body.path,
  //     createdById: userId,
  //     size: body.size,
  //     projectId: +projectId,
  //   }).save();
  //   this.server.to("project-"+projectId).emit(Flags.CREATE_FILE, file);
  // }

  // @SubscribeMessage(Flags.GET_FILE)
  // public async getDirInfos(@ConnectedSocket() client: Socket, @MessageBody() path: string) {
  //   const files = await File.query(`SELECT * FROM file WHERE path CONTAINS ${path}`);
  //   client.emit(Flags.GET_FILE, files);
  // }

  // @SubscribeMessage(Flags.RENAME_FILE)
  // public async renameFile(@MessageBody() body: RenameFileReq, @GetProject() projectId: string) {
  //   await File.update(body.id, { path: body.path });
  //   this.server.to("project-"+projectId).emit(Flags.RENAME_FILE, body);
  // }

  // @SubscribeMessage(Flags.TAG_ADD_FILE)
  // public async addTagFile(@MessageBody() body: TagAddFile, @GetProject() projectId: string) {
  //   const file = await File.findOne(body.fileId);
  //   file.tags.push(new Tag(body.tagId));
  //   file.save();
  //   this.server.to("project-"+projectId).emit(Flags.TAG_ADD_FILE, body);
  // }

  // @SubscribeMessage(Flags.TAG_REMOVE_FILE)
  // public async removeTagFile(@MessageBody() body: TagRemoveFile, @GetProject() projectId: string) {
  //   const file = await File.findOne(body.fileId);
  //   file.tags = file.tags.filter(tag => tag.id != body.tagId);
  //   await file.save();
  //   this.server.to("project-"+projectId).emit(Flags.TAG_REMOVE_FILE, body);
  // }

  @SubscribeMessage(Flags.RENAME_PROJECT)
  public async renameProject(@MessageBody() name: string, @GetProject() projectId: string) {
    await Project.update(projectId, { name });
    this.server.to("project-"+projectId).emit(Flags.RENAME_PROJECT, name);
  }

  @SubscribeMessage(Flags.ADD_USER_PROJECT)
  public async addUserProject(@MessageBody() user: UserRes, @GetProject() projectId: number) {
    this._logger.log("User:", user.name, "added to project:", projectId);
    const project = await Project.findOne({ where: { id: projectId }, relations: ["users"] });
    project.users.push(await User.findOneBy({ id: user.id }));
    await project.save();
    this.server.to("project-"+projectId).emit(Flags.ADD_USER_PROJECT, user);
  }

  @SubscribeMessage(Flags.REMOVE_USER_PROJECT)
  public async removeUserProject(@MessageBody() user: UserRes, @GetProject() projectId: number) {
    this._logger.log("User:", user.name, "removed from project:", projectId);
    const project = await Project.findOne({ where: { id: projectId }, relations: ["users"] });
    project.users.slice(project.users.indexOf(await User.findOneBy({ id: user.id })), 1);
    await project.save();
    this.server.to("project-"+projectId).emit(Flags.REMOVE_USER_PROJECT, user);
  }

}