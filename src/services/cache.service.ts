import { Document } from './../models/document.entity';
import { AppLogger } from './../utils/app-logger.util';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Change, DocumentStore, WriteDocumentReq } from 'src/sockets/models/document.model';
@Injectable()
export class CacheService implements OnModuleInit {

  private documents: DocumentStore[] = [];
  
  constructor(
    private readonly logger: AppLogger
  ) {

  }
  onModuleInit() {
    setInterval(() => this.saveDocs(), 1000 * 30);
  }

  public async registerDoc(doc: DocumentStore): Promise<number> {
    if (!this.isDocCached(doc.docId)) {
      this.logger.log("Cache updated, new doc", doc.docId);
      doc.content = (await Document.findOne(doc.docId, { select: ["content", "id"] })).content ?? '';
      this.documents.push(doc);
      console.log(doc);
    }
    return this.documents.find(el => el.docId == doc.docId).docId;
  }
  public unregisterDoc(id: number) {
    const index = this.documents.findIndex(el => el.docId == id);
    this.documents.splice(index, 1);
    this.logger.log("Cache updated, removed doc", id);
  }

  /**
   * Update a document with new changes
   * if there is an addition it adds to the docs,
   * if there is no addition it stores from where to where there is one
   * [Sorcellerie de Léo qui gère le multi éditing]
   */
  public updateDoc(packet: WriteDocumentReq): [number, Change[]] {
    const doc = this.documents.find(el => el.docId == packet.docId);
    for (let updateIndex = packet.lastUpdateId + 1; updateIndex <= doc.lastId; updateIndex++) {
      const update = doc.updates.get(updateIndex);
      let index = 0;
      for (const change of update) {
        switch (change[0]) {
          case 0://stay
            index += change[2];
            break;
          case 1://add
            for (let newChange of packet.changes) {
              switch (newChange[0]) {
                case 0://stay
                  let stayIndex = newChange[1];
                  if (stayIndex >= index)
                    (newChange[1] as number) += (change[1] as string).length;
                default:
                  break;
              }
            }
            index += (change[1] as string).length;
            break;
          case -1://remove
            for (let newChange of packet.changes) {
              switch (newChange[0]) {
                case 0://stay
                  let stayIndex = newChange[1];
                  if (stayIndex >= index)
                    (newChange[1] as number) -= (change[1] as string).length;
                default:
                  break;
              }
            }
            index -= (change[1] as string).length;
          default:
            break;
        }
      }
    }
    let content: string = "";
    let added = 0;
    for (const change of packet.changes) {
      switch (change[0]) {
        case 0:
          content += doc.content.substr((change[1] as number) - added, change[2]);
          break;
        case 1:
          content += change[1];
          added += (change[1] as string).length;
          break;
        default: break;
      }
    }
    doc.content = content;
    doc.updated = false;

    const newId = doc.addUpdate(packet.changes);
    return [newId, packet.changes];
  }

  private async saveDocs() {
    for (const doc of this.documents) {
      if (!doc.updated) {
        this.logger.log("Register cache for doc :", doc.docId, doc.content);
        await Document.update(doc.docId, { content: doc.content });
        doc.updated = true;
      }
    }
  }

  private isDocCached(id: number): boolean {
    return this.documents.find(el => el.docId == id) != null;
  }
}
