import { CustomRepository } from "@src/config/database/typeorm-ex.decorators";
import { AppRepository } from "../app.repository";
import { Relationship } from "./relationship.entity";

@CustomRepository(Relationship)
export class RelationshipRepository extends AppRepository<Relationship> {

  public getByBlueprintId(blueprintId: number): Promise<Relationship[]> {
    return this.find({ where: { blueprint: { id: blueprintId } } });
  }

  public async getFromParentNode(id: number): Promise<Relationship> {
    return this.findOneBy({ parentId: id });
  }
  public async getFromChildNode(id: number): Promise<Relationship> {
    return this.findOneBy({ childId: id });
  }

  public async updateParentNode(id: number, parentId: number): Promise<Relationship> {
    const [rel, _] = await Promise.all([
      this.findOneBy({ id }),
      this.update({ id }, { parentId })
    ]);
    rel.parentId = parentId;
    return rel;
  }
}