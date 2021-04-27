import { Node } from './../../models/node.entity';
import { Relationship } from './../../models/relationship.entity';
import { User } from './../../models/user.entity';
import { Blueprint } from 'src/models/blueprint.entity';
import { Change } from './document.model';
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
    public oy: number,
    public locked?: boolean
  ) { }
}
export class CreateNodeRes {
  constructor(
    public node: Node,
    public user: string
  ) {
  }
}
export class PlaceNodeIn {
  constructor(
    public blueprintId: number,
    public id: number,
    public pos: [number, number]
  ) {}
}
export class RemoveNodeIn {
  constructor(
    public nodeId: number,
    public blueprintId: number
  ) {}
}
export class RenameBlueprintIn {
  constructor(
    public id: number,
    public title: string
  ) {}
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
export class EditSumarryIn {
  constructor(
    public node: number,
    public content: string,
    public blueprint: number
  ) {}
}
export class WriteNodeContentIn {
  constructor(
    public changes: Change[],
    public nodeId: number,
    public userId: string,
    public blueprintId: number
  ) {}
}
export const WriteNodeContentOut = WriteNodeContentIn;