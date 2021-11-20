import { Change } from "../out/element.out";

export class ColorElementIn {
  constructor(
    public elementId: number,
    public color: string,
  ) { }
}

export class WriteElementIn {

  constructor(
    public elementId: number,
    public lastUpdateId: number,
    public changes: Change[],
    public clientId: string,
    public clientUpdateId: number,
  ) { }
}

export class RenameElementIn {
  constructor(
    public elementId: number,
    public title: string
  ) { }
}