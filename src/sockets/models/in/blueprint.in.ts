import { Pole } from "src/models/relationship/relationship.entity";

export interface CreateNodeIn {
  parentNode: number,
  childRel?: number,
  blueprint: number,
  x: number,
  y: number,
  ox: number,
  oy: number,
  relYOffset: number,
  parentPole: Pole,
  childPole: Pole,
  locked?: boolean,
}

export interface InsertNodeIn {
  blueprint: number;
  parentNode: number;
  childNode: number;
  parentPole: Pole;
  childPole: Pole;
}
export interface RemoveRelationIn {
  blueprint: number,
  parentNode: number,
  childNode: number
}
export interface EditSumarryIn {
  node: number,
  content: string,
  blueprint: number
}
export interface PlaceNodeIn {
  blueprintId: number,
  id: number,
  pos: [number, number]
}
export interface RemoveNodeIn {
  nodeId: number,
  blueprintId: number
}
export interface RemoveRelIn {
  relId: number,
  blueprintId: number
}
export interface ColorNodeIn {
  blueprintId: number,
  elementId: number,
  color: string,
}