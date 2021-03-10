import { Tag } from 'src/models/tag.entity';
import { Document } from 'src/models/document.entity';
export class OpenDocumentRes {
  constructor(
    public userId: string,
    public doc: Document
  ) {}
}
export class SendDocumentRes {
  constructor(
    public doc: Document,
    public lastUpdate: number,
    public reqId: string
  ) {}
}
export class CloseDocumentRes {
  constructor(
    public userId: string,
    public docId: number
  ) {}
}

export interface WriteDocumentReq {
  docId: number;
  lastUpdateId: number;
  changes: Change[];
  clientId: string;
  clientUpdateId: number;
}
export type Change = [1 | -1, number, string]; 
export class DocumentStore {
  public updated: boolean = true;
  public content: string;
  public lastId: number = 0;
  public readonly clientsUpdateId: Map<string, number> = new Map();
  public readonly updates: Map<number, Change[]> = new Map();
  constructor(
    public docId: number,
  ) { }
  
  public addUpdate(changes: Change[], clientId: string, clientUpdateId: number): number {
    this.updates.set(++this.lastId, changes);
    this.clientsUpdateId.set(clientId, clientUpdateId);
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
    public changes: Change[],
    public lastClientUpdateId: number
  ) { }
}

export interface CursorDocumentReq {
  docId: number,
  pos: number,
}
export interface RenameDocumentReq {
  docId: number;
  title: string;
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
    public name: string,
  ) {}
}
export class RemoveTagDocumentReq extends AddTagDocumentReq { };
export class AddTagDocumentRes {
  constructor(
    public docId: number,
    public tag: Tag
  ) {}
}
export class RemoveTagDocumentRes extends AddTagDocumentReq { };