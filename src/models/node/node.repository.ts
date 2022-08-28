import { OnModuleInit, OnApplicationBootstrap } from '@nestjs/common';
import { BlueprintRepository } from './../blueprint/blueprint.repository';
import { AppRepository } from "../app.repository";
import { Node } from "./node.entity";
import { CustomRepository, LoadCustomRepository } from '@src/config/database/typeorm-ex.decorators';
import { RelationshipRepository } from '../relationship/relationship.repository';
import { removeNodeFromTree } from '@src/utils/tree-helpers.util';

@CustomRepository(Node)
export class NodeRepository extends AppRepository<Node> {
  
  @LoadCustomRepository()
  private readonly _relRepo: RelationshipRepository;

  public getByBlueprintId(blueprintId: number): Promise<Node[]> {
    return this.find({ where: { blueprintId } });
  }

  public async placeNode(id: number, [x, y]: [number, number]) {
    await this.update({ id }, { x, y });
  }

  public updateColor(id: number, color: string) {
    return this.update({ id }, { color });
  }

  public async removeById(nodeId: number) {
    const node = await this.getOne(nodeId);
    let nodes = await this.getByBlueprintId(node.blueprintId);
    let relations = await this._relRepo.getByBlueprintId(node.blueprintId);
    const treeData = removeNodeFromTree(
      nodeId,
      nodes.filter(el => !el.isRoot),
      relations
    );
    await this._relRepo.delete(treeData.rels.map(el => el.id));
    await this.delete(treeData.nodes.map(el => el.id));
    return node;
  }

  public async updateSummaryById(id: number, summary: string) {
    await this.update({ id }, { summary });
  }

}