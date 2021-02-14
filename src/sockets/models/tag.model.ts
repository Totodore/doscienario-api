export class RenameTagReq {
  constructor(
    public name: string,
    public id: string
  ) {}
}

export class ColorTagReq {
  constructor(
    public color: number,
    public id: string
  ) {}
}