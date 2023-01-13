import { CreateNodeOut, CreateRelationOut } from './models/out/blueprint.out';
import { RelationshipRepository } from './../models/relationship/relationship.repository';
import { NodeRepository } from './../models/node/node.repository';
import { Relationship } from '../models/relationship/relationship.entity';
import { Blueprint } from '../models/blueprint/blueprint.entity';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User } from 'src/models/user/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { Flags } from './flags.enum';
import { GetProject } from 'src/decorators/project.decorator';
import { GetUserId } from 'src/decorators/user.decorator';
import { BlueprintRepository } from 'src/models/blueprint/blueprint.repository';
import { UserGuard } from 'src/guards/user.guard';
import { UseGuards } from '@nestjs/common';
import { CloseElementOut, OpenElementOut, SendElementOut } from './models/out/element.out';
import { ColorElementIn, RenameElementIn } from './models/in/element.in';
import { CreateNodeIn, EditSumarryIn, PlaceNodeIn, RemoveNodeIn, ColorNodeIn, RemoveRelIn, InsertNodeIn } from './models/in/blueprint.in';
import { AddTagElementOut } from './models/out/tag.model';
import { AddTagElementIn, RemoveTagElementIn } from './models/in/tag.in';
import { InjectRepository } from '@nestjs/typeorm';

@WebSocketGateway({ path: "/dash", cors: true })
@UseGuards(UserGuard)
export class TreeGateway {

  @WebSocketServer() server: Server;
  
  constructor(
    private readonly _logger: AppLogger,
    @InjectRepository(NodeRepository)
    private readonly _nodeRepo: NodeRepository,
    @InjectRepository(RelationshipRepository)
    private readonly _relRepo: RelationshipRepository,
    @InjectRepository(BlueprintRepository)
    private readonly _blueprintRepo: BlueprintRepository,
  ) {  }
  
  @SubscribeMessage(Flags.OPEN_BLUEPRINT)
  public async openBlueprint(@ConnectedSocket() client: Socket, @MessageBody() [reqId, docId]: [string, number?], @GetProject() projectId: number, @GetUserId() userId: string) {
    let blueprint: Blueprint;
    if (docId) {
      this._logger.log("Client opened blueprint", docId);
      blueprint = await this._blueprintRepo.getOne(docId, ["createdBy", "lastEditor", "tags", "nodes", "relationships"]);
    } else {
      this._logger.log("Client created blueprint");
      blueprint = await this._blueprintRepo.post({
        title: "Nouvel arbre",
        projectId,
        lastEditor: new User(userId),
        createdBy: new User(userId),
      });
      blueprint.tags = [];
    }

    client.emit(Flags.SEND_BLUEPRINT, new SendElementOut(blueprint, null, reqId));
    client.join("blueprint-" + blueprint.id.toString());
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.OPEN_BLUEPRINT, new OpenElementOut(userId, blueprint));
  }

  @SubscribeMessage(Flags.CLOSE_BLUEPRINT)
  public async closeBlueprint(@ConnectedSocket() client: Socket, @MessageBody() docId: number, @GetUserId() userId: string, @GetProject() projectId: string) {
    this._logger.log("Client closed blueprint", docId);
    client.leave("blueprint-" + docId);
    this.server.to("project-" + projectId.toString()).emit(Flags.CLOSE_BLUEPRINT, new CloseElementOut(userId, docId));
  }

  @SubscribeMessage(Flags.REMOVE_BLUEPRINT)
  public async removeBlueprint(@ConnectedSocket() client: Socket, @MessageBody() docId: number, @GetProject() projectId: string) {
    this._logger.log("Client remove blueprint", docId);
    await this._blueprintRepo.removeById(docId);
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.REMOVE_BLUEPRINT, docId);
    this.server.socketsLeave("blueprint-" + docId);
  }

  @SubscribeMessage(Flags.RENAME_BLUEPRINT)
  public async renameBlueprint(@ConnectedSocket() client: Socket, @MessageBody() packet: RenameElementIn, @GetProject() projectId: string) {
    if (packet.title?.length == 0)
      packet.title = "Nouveau document";
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.RENAME_BLUEPRINT, packet);
    await this._blueprintRepo.rename(packet.elementId, packet.title);
  }

  @SubscribeMessage(Flags.COLOR_BLUEPRINT)
  public async colorDoc(@ConnectedSocket() client: Socket, @MessageBody() body: ColorElementIn, @GetProject() projectId: string) {
    this._logger.log("Client color doc", body.elementId);
    await this._blueprintRepo.updateColor(body.elementId, body.color);
    client.broadcast.to("project-" + projectId).emit(Flags.COLOR_BLUEPRINT, body);
  }

  @SubscribeMessage(Flags.COLOR_NODE)
  public async colorNode(@ConnectedSocket() client: Socket, @MessageBody() body: ColorNodeIn, @GetProject() projectId: string) {
    this._logger.log("Client color node", body.elementId);
    await this._nodeRepo.updateColor(body.elementId, body.color);
    client.broadcast.to("blueprint-" + body.blueprintId).emit(Flags.COLOR_NODE, body);
  }

  @SubscribeMessage(Flags.CREATE_NODE)
  public async createNode(@ConnectedSocket() client: Socket, @MessageBody() packet: CreateNodeIn, @GetUserId() userId: string) {
    this._logger.log("Create node for", packet.blueprint);
    // Creating node
    const node = await this._nodeRepo.post({
      blueprint: new Blueprint(packet.blueprint),
      x: packet.x,
      y: packet.y,
      createdBy: new User(userId),
      lastEditor: new User(userId),
      locked: packet.locked
    });
    const [rel, patchedRel] = await Promise.all([
      // Creating relation between parent and new node
      this._relRepo.post({
        parentId: packet.parentNode,
        childId: node.id,
        blueprint: new Blueprint(packet.blueprint),
        parentPole: packet.parentPole,
        childPole: packet.childPole,
      }),
      // Updating child rel to link with the new node and not the parent
      packet.childRel ? this._relRepo.updateParentNode(packet.childRel, node.id) : null
    ]);
    this.server.to("blueprint-" + packet.blueprint).emit(Flags.CREATE_NODE, new CreateNodeOut(node, userId));
    if (patchedRel)
      this.server.to("blueprint-" + packet.blueprint).emit(Flags.PATCH_RELATIONSHIP, patchedRel);
    this.server.to("blueprint-" + packet.blueprint).emit(Flags.CREATE_RELATION, new CreateRelationOut(packet.blueprint, rel));
  }

  @SubscribeMessage(Flags.PLACE_NODE)
  public async placeNode(@ConnectedSocket() client: Socket, @MessageBody() packet: PlaceNodeIn, @GetUserId() userId: string) {
    await this._nodeRepo.placeNode(packet.id, packet.pos);
    client.broadcast.to("blueprint-" + packet.blueprintId).emit(Flags.PLACE_NODE, packet);
  }

  @SubscribeMessage(Flags.PLACE_RELATIONSHIP)
  public async placeChildRel(@ConnectedSocket() client: Socket, @MessageBody() packet: Relationship) {
    delete packet.blueprintId;
    await this._relRepo.update(packet.id, packet);
    client.broadcast.to("blueprint-" + packet.blueprint).emit(Flags.PLACE_RELATIONSHIP, packet);
  }

  @SubscribeMessage(Flags.REMOVE_NODE)
  public async removeNode(@ConnectedSocket() client: Socket, @MessageBody() packet: RemoveNodeIn, @GetUserId() userId: string) {
    this._logger.log("Remove node for", packet.nodeId);
    await this._nodeRepo.removeById(packet.nodeId);
    client.broadcast.to("blueprint-" + packet.blueprintId).emit(Flags.REMOVE_NODE, packet);
  }

  /**
   * Remove relationship should only be used when needing to remove only one relation without any other node
   */
  @SubscribeMessage(Flags.REMOVE_RELATION)
  public async removeRelation(@ConnectedSocket() client: Socket, @MessageBody() packet: RemoveRelIn) {
    this._logger.log("Remove rel for", packet.relId);
    await this._relRepo.removeById(packet.relId);
    client.broadcast.to("blueprint-" + packet.blueprintId).emit(Flags.REMOVE_RELATION, packet);
  }

  @SubscribeMessage(Flags.CREATE_RELATION)
  public async createRelation(@MessageBody() packet: Relationship) {
    this._logger.log("Create relation for", packet.blueprint.id);
    const rel = await this._relRepo.post(packet);
    this.server.to("blueprint-" + packet.blueprint.id).emit(Flags.CREATE_RELATION, new CreateRelationOut(packet.blueprint.id, rel));
  }

  @SubscribeMessage(Flags.TAG_ADD_BLUEPRINT)
  public async addTagBlueprint(@ConnectedSocket() client: Socket, @MessageBody() body: AddTagElementIn, @GetUserId() userId: string, @GetProject() projectId: string) {
    this._logger.log("Client add tag to blueprint", body.elementId, body.title);

    const { tag } = await this._blueprintRepo.addTag(body.elementId, body.title, +projectId, userId);
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.TAG_ADD_BLUEPRINT, new AddTagElementOut(body.elementId, tag));
  }

  @SubscribeMessage(Flags.TAG_REMOVE_BLUEPRINT)
  public async removeTagBlueprint(@ConnectedSocket() client: Socket, @MessageBody() body: RemoveTagElementIn, @GetProject() projectId: number) {
    this._logger.log("Client removed tag to blueprint", body.elementId, body.title);
    await this._blueprintRepo.removeTag(body.elementId, body.title, projectId);
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.TAG_REMOVE_BLUEPRINT, body);
  }

  @SubscribeMessage(Flags.SUMARRY_NODE)
  public async sumarryNode(@ConnectedSocket() client: Socket, @MessageBody() packet: EditSumarryIn) {
    await this._nodeRepo.updateSummaryById(packet.node, packet.content);
    client.broadcast.to("blueprint-" + packet.blueprint).emit(Flags.SUMARRY_NODE, packet);
  }

}