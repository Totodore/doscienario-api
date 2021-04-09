import { Relationship } from './../models/relationship.entity';
import { SendBlueprintRes, OpenBlueprintRes, CloseBlueprintRes, CreateNodeReq, CreateNodeRes, CreateRelationReq, RemoveRelationReq, CreateRelationRes, PlaceNodeIn, RemoveNodeIn } from './models/blueprint.model';
import { Node } from './../models/node.entity';
import { Blueprint } from './../models/blueprint.entity';
import { CacheService } from './../services/cache.service';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Client, Server, Socket } from 'socket.io';
import { UserRes } from 'src/controllers/user/user.res';
import { Document, DocumentTypes } from 'src/models/document.entity';
import { File } from 'src/models/file.entity';
import { Project } from 'src/models/project.entity';
import { Tag } from 'src/models/tag.entity';
import { User } from 'src/models/user.entity';
import { JwtService } from 'src/services/jwt.service';
import { AppLogger } from 'src/utils/app-logger.util';
import { removeRoom } from 'src/utils/socket.util';
import { Flags } from './flags.enum';
import { AddTagDocumentReq, AddTagDocumentRes, CloseDocumentRes, CursorDocumentReq, CursorDocumentRes, DocumentStore, OpenDocumentRes, RemoveTagDocumentReq, WriteDocumentReq, WriteDocumentRes, SendDocumentRes, RenameDocumentReq } from './models/document.model';
import { CreateFileReq, RenameFileReq } from './models/file.model';
import { ColorTagReq, RenameTagReq, TagAddFile, TagRemoveFile } from './models/tag.model';
import { createQueryBuilder, getConnectionManager, getManager } from 'typeorm';
import { removeNodeFromTree } from 'src/utils/tree-helpers.util';

@WebSocketGateway({ path: "/dash" })
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

  @WebSocketServer() server: Server;

  private users: Map<string, string> = new Map();

  constructor(
    private readonly _logger: AppLogger,
    private readonly _jwt: JwtService,
    private readonly _cache: CacheService
  ) {}

  afterInit(server: Server) {
    this._logger.log(`Websocket: namespace 'dash' initialized`);
  }

  handleConnection(client: Socket) {
    const data = this.getData(client);
    this._logger.log("New client connected ", data.user, data.project);
    this.users.set(client.id, data.user);
    client.join("project-"+data.project.toString());
    this.server.to("project-"+data.project.toString()).emit(Flags.OPEN_PROJECT, data.user);
  }

  handleDisconnect(client: Socket) {
    const data = this.getData(client);
    this._logger.log("Client disconnect", data.user, data.project);
    this.users.delete(client.id);
    this.server.to("project-"+data.project.toString()).emit(Flags.CLOSE_PROJECT, data.user);
  }

  /**
   * Triggered when someone open a doc, everyone in the projec is triggered
   * If there is no docId the document is created
   * Create a new room for only this doc
   * Send the content of the document to the user
   */
  @SubscribeMessage(Flags.OPEN_DOC)
  async openDoc(client: Socket, [reqId, docId]: [string, number?]) {
    const data = this.getData(client);
    let doc: Document;
    if (docId) {
      this._logger.log("Client opened doc", docId);
      doc = await Document.findOne(docId, {
        select: [
          "content",
          "id",
          "createdBy",
          "createdDate",
          "lastEditing",
          'lastEditor',
          'title',
          // 'tags'
        ],
        relations: ["createdBy", "lastEditor", "tags"]
      });
    } else {
      this._logger.log("Client created doc");
      doc = await Document.create({
        type: DocumentTypes.OTHERS,
        project: new Project(data.project),
        lastEditor: new User(data.user),
        createdBy: new User(data.user),
        tags: []
      }).save();
    }
    const [lastUpdateId, content] = await this._cache.registerDoc(new DocumentStore(doc.id));
    doc.content = content;
    client.emit(Flags.SEND_DOC, new SendDocumentRes(doc, lastUpdateId, reqId));
    client.join("doc-"+doc.id.toString());
    delete doc.content;
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.OPEN_DOC, new OpenDocumentRes(data.user, doc));
  }

  /**
   * Triggered when someone close a doc, everyone in the project is triggered
   * Remove the user from the doc room
   * If there everyone has closed the room then the cache is cleared
   */
  @SubscribeMessage(Flags.CLOSE_DOC)
  closeDoc(client: Socket, docId: string) {
    const data = this.getData(client);

    this._logger.log("Client closed doc", docId);
    const roomLength = Object.keys(this.server.sockets.adapter.rooms["doc-"+docId].sockets).length;
    this._logger.log("Clients in doc :", roomLength);
    if (roomLength <= 1)
      this._cache.unregisterDoc(parseInt(docId));
    client.leave("doc-"+docId);
    this.server.to("project-"+data.project.toString()).emit(Flags.CLOSE_DOC, new CloseDocumentRes(data.user, parseInt(docId)))
  }

  /**
   * Triggerred when someone write in a doc
   * We get the last client update id and we set it
   * The doc is updated via the cache service
   */
  @SubscribeMessage(Flags.WRITE_DOC)
  async writeDoc(client: Socket, body: WriteDocumentReq) {
    const data = this.getData(client);
    //We set the new update for this specific user;
    this._cache.getLastUpdateDoc(body.docId).set(data.user, body.clientUpdateId);
    
    const [updateId, changes] = this._cache.updateDoc(body);
    const userUpdates = this._cache.getLastUpdateDoc(body.docId);
    for (const clientId of Object.keys(this.server.sockets.adapter.rooms["doc-"+body.docId.toString()].sockets)) {
      const client = this.server.sockets.connected[clientId];
      client.emit(Flags.WRITE_DOC, new WriteDocumentRes(
        body.docId,
        data.user,
        updateId,
        changes,
        userUpdates.get(this.users.get(client.id)) || 0
      ));
    }
  }

  @SubscribeMessage(Flags.RENAME_DOC)
  async renameDoc(client: Socket, body: RenameDocumentReq) {
    const data = this.getData(client);
    if (body.title?.length == 0)
      body.title = "Nouveau document";
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.RENAME_DOC, body);
    await Document.update(body.docId, { title: body.title });
  }

  /**
   * Triggerred when someone move its cursor, everyone who opened the doc is triggered
   */
  @SubscribeMessage(Flags.CURSOR_DOC)
  async cursorDoc(client: Socket, body: CursorDocumentReq) {
    const data = this.getData(client);

    this.server.to("doc-"+body.docId.toString()).emit(Flags.CURSOR_DOC, new CursorDocumentRes(body, data.user));
  }

  @SubscribeMessage(Flags.REMOVE_DOC)
  async removeDoc(client: Socket, docId: string) {
    const data = this.getData(client);
    this._logger.log("Client remove doc", docId);
    await (await Document.findOne(docId)).remove();
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.REMOVE_DOC, docId);
    removeRoom(this.server, "rom-"+docId);
  }

  @SubscribeMessage(Flags.TAG_ADD_DOC)
  async addTagDoc(client: Socket, body: AddTagDocumentReq) {
    const data = this.getData(client);
    this._logger.log("Client add tag to doc", body.docId, body.name);

    let doc = await Document.findOne(body.docId, { relations: ["tags"] });
    let tag: Tag = await Tag.findOneOrCreate<Tag>({ where: { name: body.name } }, {
      name: body.name,
      project: new Project(data.project),
      createdBy: new User(data.user)
    });
    console.log(tag);
    await createQueryBuilder().relation(Document, "tags").of(doc).add(tag);
    this.server.to("project-"+data.project.toString()).emit(Flags.TAG_ADD_DOC, new AddTagDocumentRes(body.docId, tag));
  }

  @SubscribeMessage(Flags.TAG_REMOVE_DOC)
  async removeTagDoc(client: Socket, body: RemoveTagDocumentReq) {
    const data = this.getData(client);
    this._logger.log("Client removed tag to doc", body.docId, body.name);

    const doc = await Document.findOne(body.docId, { relations: ["tags"] });
    await createQueryBuilder().relation(Document, "tags").of(doc).remove(await Tag.findOne({ where: { name: body.name } }));
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.TAG_REMOVE_DOC, body);
  }

  @SubscribeMessage(Flags.CREATE_TAG)
  async createTag(client: Socket, tag: Tag) {
    const data = this.getData(client);
    this._logger.log("Client create tag", tag);

    if (await Tag.exists<Tag>({ where: { project: new Project(data.project), name: tag.name.toLowerCase() } }))
      throw new WsException("Tag already exist");

    tag = await Tag.create({ createdBy: new User(data.user), project: new Project(data.project), ...tag, color: tag.color }).save();
    this.server.to("project-"+data.project.toString()).emit(Flags.CREATE_TAG, tag);
  }

  @SubscribeMessage(Flags.REMOVE_TAG)
  async removeTag(client: Socket, tagName: string) {
    const data = this.getData(client);
    this._logger.log("Client remove tag");
    await (await Tag.findOne({ where: { name: tagName } })).remove();
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.REMOVE_TAG, tagName);
  }

  @SubscribeMessage(Flags.RENAME_TAG)
  async updateTag(client: Socket, body: RenameTagReq) {
    const data = this.getData(client);
    this._logger.log("Client rename tag");

    await createQueryBuilder(Tag).update().set({ name: body.name }).where({ name: body.oldName }).execute();
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.RENAME_TAG, body);
  }

  @SubscribeMessage(Flags.COLOR_TAG)
  async colorTag(client: Socket, body: ColorTagReq) {
    const data = this.getData(client);
    this._logger.log("Client update color tag");

    await createQueryBuilder(Tag).update().set({ color: body.color.substr(1) }).where({ name: body.name }).execute();
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.COLOR_TAG, body);
  }

  @SubscribeMessage(Flags.CREATE_FILE)
  async createFile(client: Socket, body: CreateFileReq) {
    const data = this.getData(client);
    this._logger.log("Client create file");
    const file = await File.create({
      id: body.id,
      mime: body.mime,
      path: body.path,
      createdById: data.user,
      size: body.size,
      projectId: data.project,
    }).save();
    this.server.to("project-"+data.project.toString()).emit(Flags.CREATE_FILE, file);
  }

  @SubscribeMessage(Flags.GET_FILE)
  async getDirInfos(client: Socket, path: string) {
    const files = await File.query(`SELECT * FROM file WHERE path CONTAINS ${path}`);
    client.emit(Flags.GET_FILE, files);
  }

  @SubscribeMessage(Flags.RENAME_FILE)
  async renameFile(client: Socket, body: RenameFileReq) {
    const data = this.getData(client);
    await File.update(body.id, { path: body.path });
    this.server.to("project-"+data.project.toString()).emit(Flags.RENAME_FILE, body);
  }

  @SubscribeMessage(Flags.TAG_ADD_FILE)
  async addTagFile(client: Socket, body: TagAddFile) {
    const data = this.getData(client);
    const file = await File.findOne(body.fileId);
    file.tags.push(new Tag(body.tagId));
    file.save();
    this.server.to("project-"+data.project.toString()).emit(Flags.TAG_ADD_FILE, body);
  }

  @SubscribeMessage(Flags.TAG_REMOVE_FILE)
  async removeTagFile(client: Socket, body: TagRemoveFile) {
    const data = this.getData(client);
    const file = await File.findOne(body.fileId);
    file.tags = file.tags.filter(tag => tag.id != body.tagId);
    await file.save();
    this.server.to("project-"+data.project.toString()).emit(Flags.TAG_REMOVE_FILE, body);
  }

  @SubscribeMessage(Flags.RENAME_PROJECT)
  async renameProject(client: Socket, name: string) {
    const data = this.getData(client);
    await Project.update(data.project, { name });
    this.server.to("project-"+data.project.toString()).emit(Flags.RENAME_PROJECT, name);
  }

  @SubscribeMessage(Flags.ADD_USER_PROJECT)
  async addUserProject(client: Socket, user: UserRes) {
    const data = this.getData(client);
    const project = await Project.findOne(data.project, { relations: ["users"] });
    project.users.push(await User.findOne(user.id));
    await project.save();
    this.server.to("project-"+data.project.toString()).emit(Flags.ADD_USER_PROJECT, user);
  }

  @SubscribeMessage(Flags.REMOVE_USER_PROJECT)
  async removeUserProject(client: Socket, user: UserRes) {
    const data = this.getData(client);
    const project = await Project.findOne(data.project, { relations: ["users"] });
    project.users.slice(project.users.indexOf(await User.findOne(user.id)), 1);
    await project.save();
    this.server.to("project-"+data.project.toString()).emit(Flags.REMOVE_USER_PROJECT, user);
  }

  @SubscribeMessage(Flags.OPEN_BLUEPRINT)
  async openBlueprint(client: Socket, [reqId, docId]: [string, number?]) {
    const data = this.getData(client);
    let blueprint: Blueprint;
    if (docId) {
      this._logger.log("Client opened blueprint", docId);
      blueprint = await Blueprint.createQueryBuilder("blueprint").where("blueprint.id = :docId", { docId })
        .leftJoinAndSelect("blueprint.createdBy", "createdBy")
        .leftJoinAndSelect("blueprint.lastEditor", "lastEditor")
        .leftJoinAndSelect("blueprint.tags", "tags")
        .leftJoinAndSelect("blueprint.nodes", "nodes")
        .leftJoinAndSelect("blueprint.relationships", "relations").getOne();
    } else {
      this._logger.log("Client created blueprint");
      blueprint = await Blueprint.create({
        project: new Project(data.project),
        lastEditor: new User(data.user),
        createdBy: new User(data.user),
      }).save();
      const node = await Node.create({ blueprint, isRoot: true, createdBy: new User(data.user), lastEditor: new User(data.user), x: 0, y: 0 }).save();
      blueprint.nodes = [node];
      blueprint.relationships = [];
    }
    client.emit(Flags.SEND_BLUEPRINT, new SendBlueprintRes(blueprint, reqId));
    client.join("blueprint-" + blueprint.id.toString());
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.OPEN_BLUEPRINT, new OpenBlueprintRes(blueprint, data.user));
  }

  @SubscribeMessage(Flags.CLOSE_BLUEPRINT)
  async closeBlueprint(client: Socket, docId: number) {
    const data = this.getData(client);
    
    this._logger.log("Client closed blueprint", docId);
    const roomLength = Object.keys(this.server.sockets.adapter.rooms["blueprint-" + docId].sockets).length;
    this._logger.log("Clients in blueprint :", roomLength);
    client.leave("blueprint-" + docId);
    this.server.to("project-"+data.project.toString()).emit(Flags.CLOSE_BLUEPRINT, new CloseBlueprintRes(data.user, docId));
  }

  @SubscribeMessage(Flags.REMOVE_BLUEPRINT)
  async removeBlueprint(client: Socket, docId: number) {
    const data = this.getData(client);
    this._logger.log("Client remove blueprint", docId);
    await (await Blueprint.findOne(docId)).remove();
    client.broadcast.to("project-"+data.project.toString()).emit(Flags.REMOVE_BLUEPRINT, docId);
    removeRoom(this.server, "blueprint-"+docId);
  }

  @SubscribeMessage(Flags.CREATE_NODE)
  async createNode(client: Socket, packet: CreateNodeReq) {
    const data = this.getData(client);
    this._logger.log("Create node for", packet.blueprint);
    const node = await Node.create({
      blueprint: new Blueprint(packet.blueprint),
      x: packet.x,
      y: packet.y,
      createdBy: new User(data.user),
      lastEditor: new User(data.user)
    }).save();
    const rel = await Relationship.create({
      parentId: packet.parentNode,
      childId: node.id,
      blueprint: new Blueprint(packet.blueprint),
      ox: packet.ox,
      oy: packet.oy,
      ex: packet.x,
      ey: packet.y
    }).save();
    this.server.to("blueprint-" + packet.blueprint).emit(Flags.CREATE_NODE, new CreateNodeRes(node, data.user));
    this.server.to("blueprint-" + packet.blueprint).emit(Flags.CREATE_RELATION, new CreateRelationRes(packet.blueprint, rel));
    await Blueprint.update(packet.blueprint, { lastEditing: new Date(), lastEditor: new User(data.user) });
  }

  @SubscribeMessage(Flags.PLACE_NODE)
  async placeNode(client: Socket, packet: PlaceNodeIn) {
    const data = this.getData(client);
    await Node.update(packet.id, { x: packet.pos[0], y: packet.pos[1] });
    client.broadcast.to("blueprint-" + packet.blueprintId).emit(Flags.PLACE_NODE, packet);
    await Blueprint.update(packet.blueprintId, { lastEditing: new Date(), lastEditor: new User(data.user) });
  }

  @SubscribeMessage(Flags.PLACE_RELATIONSHIP)
  async placeChildRel(client: Socket, packet: Relationship) {
    this.getData(client);
    await Relationship.update(packet.id, packet);
    client.broadcast.to("blueprint-" + packet.blueprint).emit(Flags.PLACE_RELATIONSHIP, packet);
  }

  @SubscribeMessage(Flags.REMOVE_NODE)
  async removeNode(client: Socket, packet: RemoveNodeIn) {
    const data = this.getData(client);
    this._logger.log("Remove node for", packet.nodeId);
    let nodes = await Node.find({ where: { blueprint: new Blueprint(packet.blueprintId) } });
    let relations = await Relationship.find({ where: { blueprint: new Blueprint(packet.blueprintId) } });
    const treeData = removeNodeFromTree(packet.nodeId, nodes.map(el => el.id), relations.map(el => [el.parentId, el.childId, el.id]));
    await Relationship.delete(treeData.rels);
    await Node.delete(treeData.nodes);
    client.broadcast.to("blueprint-" + packet.blueprintId).emit(Flags.REMOVE_NODE, packet);
    await Blueprint.update(packet.blueprintId, { lastEditing: new Date(), lastEditor: new User(data.user) });
  }

  @SubscribeMessage(Flags.CREATE_RELATION)
  async createRelation(client: Socket, packet: CreateRelationReq) {
    this.getData(client);
    this._logger.log("Create relation for", packet.blueprint);
    const relation = await Relationship.create({ childId: packet.childNode, parentId: packet.parentNode }).save();
    client.broadcast.to("blueprint-" + packet.blueprint).emit(Flags.CREATE_RELATION, new CreateRelationRes(packet.blueprint, relation));
  }

  @SubscribeMessage(Flags.REMOVE_RELATION)
  async removeRelation(client: Socket, packet: RemoveRelationReq) {
    this.getData(client);
    this._logger.log("Remove relation for", packet.blueprint);
    await Relationship.delete({ parentId: packet.parentNode, childId: packet.childNode });
    client.broadcast.to("blueprint-" + packet.blueprint).emit(Flags.REMOVE_RELATION, packet);
  }



  getData(client: Socket): DataInterface {
    if (!this._jwt.verify(client.handshake.query.authorization))
      throw new WsException("Forbidden");
    return {
      user: this._jwt.getUserId(client.handshake.query.authorization?.toString())?.toString(),
      project: parseInt(client.handshake.query.project?.toString())
    }
  }

}

interface DataInterface {
  user: string;
  project: number
}