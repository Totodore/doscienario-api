import { Blueprint } from './../blueprint/blueprint.entity';

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
    return this.find({ where: { blueprint: { id: blueprintId } } });
  }

  public async placeNode(id: number, [x, y]: [number, number]) {
    await this.update({ id }, { x, y });
  }

  public updateColor(id: number, color: string) {
    return this.update({ id }, { color });
  }

  public async recursiveRemoveById(nodeId: number) {
    const node = await this.getOne(nodeId);
    const [nodes, relations] = await Promise.all([
      this.getByBlueprintId(node.blueprintId),
      this._relRepo.getByBlueprintId(node.blueprintId)
    ]);
    const treeData = removeNodeFromTree(
      nodeId,
      nodes.filter(el => !el.isRoot),
      relations
    );
    await Promise.all([
      this._relRepo.delete(treeData.rels.map(el => el.id)),
      this.delete(treeData.nodes.map(el => el.id))
    ]);
    return node;
  }

  public async removeById(id: number) {
    const parentRel = await this._relRepo.getFromChildNode(id);
    await Promise.all([
      this._relRepo.delete({ childId: id }),
      this._relRepo.update({ parentId: id }, { parentId: parentRel.parentId }),
      this.delete(id),
    ]);
    return null;
  }

  public async updateSummaryById(id: number, summary: string) {
    await this.update({ id }, { summary });
  }

}