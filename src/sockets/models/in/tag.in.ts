export class RenameTagIn {
  constructor(
    public title: string,
    public oldTitle: string
  ) {}
}

export class ColorTagIn {
  constructor(
    public color: string,
    public title: string
  ) {}
}

export class AddTagElementIn {
  constructor(
    public elementId: number,
    public title: string,
  ) {}
}
export class RemoveTagElementIn extends AddTagElementIn { };