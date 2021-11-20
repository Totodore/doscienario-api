import { DeepPartial, EntityRepository } from "typeorm";
import { ElementRepository } from "../element/element.repository";
import { Blueprint } from "./blueprint.entity";
import { Node } from "../node/node.entity";
import { User } from "../user/user.entity";
import { Relationship } from "../relationship/relationship.entity";

@EntityRepository(Blueprint)
export class BlueprintRepository extends ElementRepository<Blueprint> {

  
  public async post(data: DeepPartial<Blueprint>) {
    const blueprint = await super.post(data);
    const node = await Node.create({ ...blueprint, blueprint, isRoot: true, x: 0, y: 0 }).save();
    blueprint.nodes = [node];
    blueprint.relationships = [];
    return blueprint;
  }

  public async removeById(id: number) {
    await Node.delete({ blueprint: new Blueprint(id) });
    await Relationship.delete({ blueprint: new Blueprint(id) });
    return await (await Blueprint.findOne(id)).remove();
  }
}