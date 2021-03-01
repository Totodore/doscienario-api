export class RenameTagReq {
  constructor(
    public name: string,
    public oldName: string
  ) {}
}

export class ColorTagReq {
  constructor(
    public color: string,
    public name: string
  ) {}
}

export class TagAddFile {
  constructor(
    public tagId: number,
    public fileId: string
  ) {}
}

export class TagRemoveFile extends TagAddFile { }