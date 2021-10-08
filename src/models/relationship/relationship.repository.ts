import { EntityRepository } from "typeorm";
import { AppRepository } from "../app.repository";
import { Blueprint } from "../blueprint/blueprint.entity";
import { Relationship } from "./relationship.entity";

@EntityRepository(Relationship)
export class RelationshipRepository extends AppRepository<Relationship> {

  public getByBlueprintId(blueprintId: number): Promise<Relationship[]> {
    return this.find({ where: { blueprint: new Blueprint(blueprintId) } });
  }
}