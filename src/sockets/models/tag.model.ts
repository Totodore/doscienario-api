export class RenameTagReq {
  constructor(
    public title: string,
    public oldTitle: string
  ) {}
}

export class ColorTagReq {
  constructor(
    public color: string,
    public title: string
  ) {}
}

export class TagAddFile {
  constructor(
    public tagId: number,
    public fileId: string
  ) {}
}

export class TagRemoveFile extends TagAddFile { }