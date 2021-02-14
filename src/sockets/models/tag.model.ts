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

export class TagAddFile {
  constructor(
    public tagId: number,
    public fileId: string
  ) {}
}

export class TagRemoveFile extends TagAddFile { }