import { CursorDocumentIn } from './../in/document.in';

export class CursorDocumentOut {

  public docId: number;
  public pos: number;

  constructor(
    req: CursorDocumentIn,
    public userId: string,
  ) {
    this.docId = req.docId;
    this.pos = req.pos;
  }

}