import { Document } from 'src/models/document.entity';
export class OpenDocumentRes {
  constructor(
    public userId: string,
    public docId: number
  ) {}
}
export class SendDocumentRes {
  constructor(
    public doc: Document,
    public lastUpdate: number
  ) {}
}
export class CloseDocumentRes extends OpenDocumentRes { }

export interface WriteDocumentReq {
  docId: number;
  lastUpdateId: number;
  changes: Change[];
}
export type Change = [1 | 0 | -1, string | number, number?]; 
export class DocumentStore {
  public updated: boolean = true;
  public content: string;
  public lastId: number = 0;
  public readonly updates: Map<number, Change[]> = new Map();
  constructor(
    public docId: number,
  ) { }
  
  public addUpdate(changes: Change[]): number {
    this.updates.set(++this.lastId, changes);
    if (this.updates.size === 30)
      this.updates.delete(this.lastId - 29);
    return this.lastId;
  }
}
export class WriteDocumentRes {

  
  constructor(
    public docId: number,
    public userId: string,
    public updateId: number,
    public change: Change[],
  ) { }
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