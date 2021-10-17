import { Node } from '../../../models/node/node.entity';
import { Relationship } from '../../../models/relationship/relationship.entity';

export class CreateNodeOut {
  constructor(
    public node: Node,
    public user: string
  ) {
  }
}
export class CreateRelationOut {
  constructor(
    public blueprint: number,
    public relation: Relationship
  ) { }
}