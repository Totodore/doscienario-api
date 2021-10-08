import { RelationshipRepository } from './../models/relationship/relationship.repository';
import { NodeRepository } from './../models/node/node.repository';
import { Relationship } from '../models/relationship/relationship.entity';
import { SendBlueprintRes, OpenBlueprintRes, CloseBlueprintRes, CreateNodeReq, CreateNodeRes, CreateRelationRes, PlaceNodeIn, RemoveNodeIn, RenameBlueprintIn, EditSumarryIn, WriteNodeContentIn } from './models/blueprint.model';
import { Blueprint } from '../models/blueprint/blueprint.entity';
import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Project } from 'src/models/project/project.entity';
import { User } from 'src/models/user/user.entity';
import { AppLogger } from 'src/utils/app-logger.util';
import { removeRoom } from 'src/utils/socket.util';
import { Flags } from './flags.enum';
import { AddTagDocumentReq, AddTagDocumentRes, DocumentStore, RemoveTagDocumentReq } from './models/document.model';
import { getCustomRepository } from 'typeorm';
import { nodeCache } from 'src/main';
import { GetProject } from 'src/decorators/project.decorator';
import { GetUserId } from 'src/decorators/user.decorator';
import { BlueprintRepository } from 'src/models/blueprint/blueprint.repository';
import { UserGuard } from 'src/guards/user.guard';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({ path: "/dash" })
@UseGuards(UserGuard)
export class TreeGateway implements OnGatewayInit {

  @WebSocketServer() server: Server;
  
  public _blueprintRepo: BlueprintRepository;
  public _nodeRepo: NodeRepository;
  public _relRepo: RelationshipRepository;

  constructor(
    private readonly _logger: AppLogger,
  ) { }
  
  public afterInit(_server: Server) {
    this._blueprintRepo = getCustomRepository(BlueprintRepository);
    this._nodeRepo = getCustomRepository(NodeRepository);
    this._relRepo = getCustomRepository(RelationshipRepository);
  }

  @SubscribeMessage(Flags.OPEN_BLUEPRINT)
  public async openBlueprint(@ConnectedSocket() client: Socket, @MessageBody() [reqId, docId]: [string, number?], @GetProject() projectId: string, @GetUserId() userId: string) {
    let blueprint: Blueprint;
    if (docId) {
      this._logger.log("Client opened blueprint", docId);
      blueprint = await this._blueprintRepo.getOne(docId, ["createdBy", "lastEditor", "tags", "nodes", "relationships"]);
    } else {
      this._logger.log("Client created blueprint");
      blueprint = await this._blueprintRepo.post({
        project: new Project(projectId),
        lastEditor: new User(userId),
        createdBy: new User(userId),
      });
    }
    for (const node of blueprint.nodes)
      node.content = (await nodeCache.registerDoc(new DocumentStore(node.id+"", blueprint.id+"")))[1];

    client.emit(Flags.SEND_BLUEPRINT, new SendBlueprintRes(blueprint, reqId));
    client.join("blueprint-" + blueprint.id.toString());
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.OPEN_BLUEPRINT, new OpenBlueprintRes(blueprint, userId));
  }

  @SubscribeMessage(Flags.CLOSE_BLUEPRINT)
  public async closeBlueprint(@ConnectedSocket() client: Socket, @MessageBody() docId: number, @GetUserId() userId: string, @GetProject() projectId: string) {
    this._logger.log("Client closed blueprint", docId);
    const roomLength = Object.keys(this.server.sockets.adapter.rooms["blueprint-" + docId].sockets).length;
    if (roomLength <= 1)
      nodeCache.unregisterDoc(docId+"", true);
    client.leave("blueprint-" + docId);
    this.server.to("project-" + projectId.toString()).emit(Flags.CLOSE_BLUEPRINT, new CloseBlueprintRes(userId, docId));
  }

  @SubscribeMessage(Flags.REMOVE_BLUEPRINT)
  public async removeBlueprint(@ConnectedSocket() client: Socket, @MessageBody() docId: number, @GetProject() projectId: string) {
    this._logger.log("Client remove blueprint", docId);
    await this._blueprintRepo.removeById(docId);
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.REMOVE_BLUEPRINT, docId);
    removeRoom(this.server, "blueprint-" + docId);
    nodeCache.unregisterDoc(docId+"", true);
  }

  @SubscribeMessage(Flags.RENAME_BLUEPRINT)
  public async renameBlueprint(@ConnectedSocket() client: Socket, @MessageBody() packet: RenameBlueprintIn, @GetProject() projectId: string) {
    if (packet.title?.length == 0)
      packet.title = "Nouveau document";
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.RENAME_BLUEPRINT, packet);
    await this._blueprintRepo.rename(packet.id, packet.title);
  }

  @SubscribeMessage(Flags.CREATE_NODE)
  public async createNode(@ConnectedSocket() client: Socket, @MessageBody() packet: CreateNodeReq, @GetUserId() userId: string) {
    this._logger.log("Create node for", packet.blueprint);
    const node = await this._nodeRepo.post({
      blueprint: new Blueprint(packet.blueprint),
      x: packet.x,
      y: packet.y,
      createdBy: new User(userId),
      lastEditor: new User(userId),
      locked: packet.locked
    });
    const rel = await this._relRepo.post({
      parentId: packet.parentNode,
      childId: node.id,
      blueprint: new Blueprint(packet.blueprint),
      ox: packet.ox,
      oy: packet.oy + packet.relYOffset,
      ex: packet.x,
      ey: packet.y + packet.relYOffset
    });
    await nodeCache.registerDoc(new DocumentStore(node.id+"", node.blueprint.id+""));
    this.server.to("blueprint-" + packet.blueprint).emit(Flags.CREATE_NODE, new CreateNodeRes(node, userId));
    this.server.to("blueprint-" + packet.blueprint).emit(Flags.CREATE_RELATION, new CreateRelationRes(packet.blueprint, rel));
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
    nodeCache.unregisterDoc(packet.nodeId+"");
  }

  @SubscribeMessage(Flags.CREATE_RELATION)
  public async createRelation(@MessageBody() packet: Relationship, @GetUserId() userId: string) {
    this._logger.log("Create relation for", packet.blueprint.id);
    const rel = await this._relRepo.post(packet);
    this.server.to("blueprint-" + packet.blueprint.id).emit(Flags.CREATE_RELATION, new CreateRelationRes(packet.blueprint.id, rel));
  }

  @SubscribeMessage(Flags.TAG_ADD_BLUEPRINT)
  public async addTagBlueprint(@ConnectedSocket() client: Socket, @MessageBody() body: AddTagDocumentReq, @GetUserId() userId: string, @GetProject() projectId: string) {
    this._logger.log("Client add tag to blueprint", body.docId, body.name);

    const { tag } = await this._blueprintRepo.addTag(body.docId, body.name, +projectId, userId);
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.TAG_ADD_BLUEPRINT, new AddTagDocumentRes(body.docId, tag));
  }

  @SubscribeMessage(Flags.TAG_REMOVE_BLUEPRINT)
  public async removeTagBlueprint(@ConnectedSocket() client: Socket, @MessageBody() body: RemoveTagDocumentReq, @GetUserId() userId: string, @GetProject() projectId: string) {
    this._logger.log("Client removed tag to blueprint", body.docId, body.name);
    await this._blueprintRepo.removeTag(body.docId, body.name);
    client.broadcast.to("project-" + projectId.toString()).emit(Flags.TAG_REMOVE_BLUEPRINT, body);
  }

  @SubscribeMessage(Flags.SUMARRY_NODE)
  public async sumarryNode(@ConnectedSocket() client: Socket, @MessageBody() packet: EditSumarryIn) {
    await this._nodeRepo.updateSummaryById(packet.node, packet.content);
    client.broadcast.to("blueprint-" + packet.blueprint).emit(Flags.SUMARRY_NODE, packet);
  }
  @SubscribeMessage(Flags.CONTENT_NODE)
  public async contentNode(@ConnectedSocket() client: Socket, @MessageBody() body: WriteNodeContentIn) {
    nodeCache.updateDoc(body);
    client.broadcast.to("blueprint-" + body.blueprintId.toString()).emit(Flags.CONTENT_NODE, body);
  }

}