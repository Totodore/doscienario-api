import { CustomRepository } from "@src/config/database/typeorm-ex.decorators";
import { AppRepository } from "../app.repository";
import { Relationship } from "./relationship.entity";

@CustomRepository(Relationship)
export class RelationshipRepository extends AppRepository<Relationship> {

  public getByBlueprintId(blueprintId: number): Promise<Relationship[]> {
    return this.find({ where: { blueprintId } });
  }
}