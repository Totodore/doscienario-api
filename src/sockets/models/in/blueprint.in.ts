export class CreateNodeIn {
  constructor(
    public parentNode: number,
    public blueprint: number,
    public x: number,
    public y: number,
    public ox: number,
    public oy: number,
    public relYOffset: number,
    public locked?: boolean
  ) { }
}
export class RemoveRelationIn {
  constructor(
    public blueprint: number,
    public parentNode: number,
    public childNode: number
  ) {}
}
export class EditSumarryIn {
  constructor(
    public node: number,
    public content: string,
    public blueprint: number
  ) {}
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