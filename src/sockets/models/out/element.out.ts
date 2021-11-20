import { ElementEntity } from 'src/models/element/element.entity';
export class OpenElementOut {
  constructor(
    public userId: string,
    public element: ElementEntity
  ) {}
}
export class SendElementOut {
  constructor(
    public element: ElementEntity,
    public lastUpdate: number,
    public reqId: string
  ) {}
}

export class ElementStore {
  public updated: boolean = true;
  public content: string;
  public lastId: number = 0;
  public readonly clientsUpdateId: Map<string, number> = new Map();
  public readonly updates: Map<number, Change[]> = new Map();
  constructor(
    public elementId: number,
    public parentId?: number
  ) { }
  
  public addUpdate(changes: Change[], clientId: string, clientUpdateId: number): number {
    this.updates.set(++this.lastId, changes);
    this.clientsUpdateId.set(clientId, clientUpdateId);
    if (this.updates.size === 30)
      this.updates.delete(this.lastId - 29);
    return this.lastId;
  }
}
export type Change = [1 | -1 | 2, number, string]; 

export class WriteElementOut {
  
  constructor(
    public elementId: number,
    public userId: string,
    public updateId: number,
    public changes: Change[],
    public lastClientUpdateId: number
  ) { }
}
export class CloseElementOut {
  constructor(
    public userId: string,
    public elementId: number
  ) {}
}