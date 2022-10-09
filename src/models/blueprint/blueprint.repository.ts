import { DeepPartial } from "typeorm";
import { ElementRepository } from "../element/element.repository";
import { Blueprint } from "./blueprint.entity";
import { Node } from "../node/node.entity";
import { Relationship } from "../relationship/relationship.entity";
import { CustomRepository } from "@src/config/database/typeorm-ex.decorators";
@CustomRepository(Blueprint)
export class BlueprintRepository extends ElementRepository<Blueprint> {


  public async post(data: DeepPartial<Blueprint>) {
    const blueprint = await super.post(data);
    const node = await Node.create({ ...blueprint, blueprint, isRoot: true, x: 0, y: 0 }).save();
    blueprint.nodes = [node];
    blueprint.relationships = [];
    await blueprint.save();
    return blueprint;
  }

  public async removeById(id: number) {
    await Node.delete({ blueprint: { id } });
    await Relationship.delete({ blueprint: { id } });
    return await (await Blueprint.findOneBy({ id })).remove();
  }
}