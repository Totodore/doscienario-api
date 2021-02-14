export class CreateFileReq {

  constructor(
    public id: string,
    public mime: string,
    public path: string,
    public size: number,
  ) {}
}

export class RenameFileReq {
  constructor(
    public id: string,
    public path: string,
  ) {}
}