import { Node } from './../../models/node.entity';
import { Relationship } from './../../models/relationship.entity';
import { User } from './../../models/user.entity';
import { Blueprint } from 'src/models/blueprint.entity';
export class SendBlueprintRes {
  constructor(
    public blueprint: Blueprint,
    public reqId: string
  ) { }
}
export class OpenBlueprintRes {
  constructor(
    public blueprint: Blueprint,
    public user: string
  ) { }
}
export class CloseBlueprintRes {
  constructor(
    public user: string,
    public id: number
  ) { }
}

export class CreateNodeReq {
  constructor(
    public parentNode: number,
    public blueprint: number,
    public x: number,
    public y: number,
    public ox: number,
    public oy: number
  ) { }
}
export class CreateNodeRes {
  constructor(
    public node: Node,
    public user: string
  ) {
  }
}
export class RemoveNodeRes {
  constructor(
    public id: number,
    public blueprint: number
  ) {}
}
export class CreateRelationReq {
  constructor(
    public parentNode: number,
    public childNode: number,
    public blueprint: number
  ) { }
}
export class CreateRelationRes {
  constructor(
    public blueprint: number,
    public relation: Relationship
  ) { }
}
export class RemoveRelationReq {
  constructor(
    public blueprint: number,
    public parentNode: number,
    public childNode: number
  ) {}
};