export class OpenDocumentRes {
  constructor(
    public userId: string,
    public docId: string
  ) {}
}
export class CloseDocumentRes extends OpenDocumentRes { }

export interface WriteDocumentReq {
  docId: number;
  pos: number;
  content: string;
}

export class WriteDocumentRes {

  public docId: number;
  public pos: number;
  public content: string;

  constructor(
    req: WriteDocumentReq,
    public userId: string
  ) {
    this.docId = req.docId;
    this.pos = req.pos;
    this.content = req.content;
  }
}

export interface CursorDocumentReq {
  docId: number,
  pos: number,
}
export class CursorDocumentRes {

  public docId: number;
  public pos: number;

  constructor(
    req: CursorDocumentReq,
    public userId: string,
  ) {
    this.docId = req.docId;
    this.pos = req.pos;
  }

}

export class AddTagDocumentReq {
  constructor(
    public docId: number,
    public tagId: number,
  ) {}
}
export class RemoveTagDocumentReq extends AddTagDocumentReq { };
export class AddTagDocumentRes extends AddTagDocumentReq { };
export class RemoveTagDocumentRes extends AddTagDocumentReq { };