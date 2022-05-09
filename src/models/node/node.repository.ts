import { RelationshipRepository } from './../relationship/relationship.repository';
import { InjectRepository } from "@nestjs/typeorm";
import { removeNodeFromTree } from "src/utils/tree-helpers.util";
import { AppRepository } from "../app.repository";
import { Blueprint } from "../blueprint/blueprint.entity";
import { Node } from "./node.entity";
import { EntityRepository, getCustomRepository } from 'typeorm';

@EntityRepository(Node)
export class NodeRepository extends AppRepository<Node> {
  
  constructor(
    @InjectRepository(RelationshipRepository)
    private readonly _relRepo: RelationshipRepository
  ) {
    super();
    // Fix: Sometime relRepo is not injected
    if (!(this._relRepo instanceof RelationshipRepository))
      this._relRepo = getCustomRepository(RelationshipRepository);
  }

  public getByBlueprintId(blueprintId: number): Promise<Node[]> {
    return this.find({ where: { blueprint: new Blueprint(blueprintId) } });
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
      nodes.filter(el => !el.isRoot).map(el => el.id),
      relations.map(el => [el.parentId, el.childId, el.id])
    );
    await this._relRepo.delete(treeData.rels);
    await this.delete(treeData.nodes);
    return node;
  }

  public async updateSummaryById(id: number, summary: string) {
    await this.update({ id }, { summary });
  }

}