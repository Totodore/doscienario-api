import { Node } from './../models/node.entity';
import { Document } from './../models/document.entity';
import { AppLogger } from './../utils/app-logger.util';
import { Change, DocumentStore, WriteDocumentReq } from 'src/sockets/models/document.model';

export class CacheUtil {

  private documents: DocumentStore[] = [];
  
  constructor(
    private readonly logger: AppLogger,
    private readonly Table: typeof Document | typeof Node
  ) {
    setInterval(() => this.saveDocs(), 1000 * 30);
  }

  public async registerDoc(doc: DocumentStore): Promise<[number, string]> {
    if (!this.isDocCached(doc.docId)) {
      this.logger.log("Cache updated, new", this.Table.name, doc.docId);
      doc.content = (await this.Table.findOne(doc.docId, { select: ["content", "id"] })).content ?? '';
      this.documents.push(doc);
      console.log(doc);
    }
    const docEl = this.documents.find(el => el.docId == doc.docId);
    return [docEl.docId, docEl.content];
  }
  public unregisterDoc(id: number) {
    if (this.Table === Document) {
      const index = this.documents.findIndex(el => el.docId == id);
      this.documents.splice(index, 1);
    } else {
      for (const doc of this.documents) {
        if (doc.parentId === id)
          this.documents.splice(this.documents.indexOf(doc), 1);
      }
    }
    this.logger.log("Cache updated, removed", this.Table.name, id);
  }

  /**
   * Update a document with new changes
   * if there is an addition it adds to the docs,
   * if there is no addition it stores from where to where there is one
   * [Sorcellerie qui gère le multi éditing]
   */
  public updateDoc(packet: WriteDocumentReq): [number, Change[]] {
    //On récupère le document
    const doc = this.documents.find(el => el.docId == packet.docId);
    //On part du dernier ID du packet recu jusqu'au dernière id du document, 
    // for (let updateIndex = packet.lastUpdateId + 1; updateIndex <= doc.lastId; updateIndex++) {
    //   //On récupère chaque update depuis le dernière id du packet jusqu'au dernier id actuel
    //   const update = doc.updates.get(updateIndex);
    //   let indexDiff = 0;
    //   //Pour chaque changement dans l'update
    //   for (const change of update) {
    //     switch (change[0]) {
    //       case 1://Si c'est un ajout :
    //         for (let newChange of packet.changes) { //Pour chaque nouveau changement
    //             let newChangeIndex = newChange[1]; //on récupère l'index de l'ajout
    //             if (newChangeIndex >= change[1] - indexDiff) // Si l'index de l'ajout est supérieur à l'index actuel
    //               newChange[1] += change[2].length;
    //             //On ajoute la taille de l'ancien ajout au nouvel index
    //         }
    //         indexDiff += change[2].length;  //On ajoute à l'index la taille du changement
    //         break;
    //       case -1://Si c'est une suppression
    //         for (let newChange of packet.changes) { //Pour chaque changement
    //           let newChangeIndex = newChange[1]; //On récupère l'index du nouvel l'ajout
    //           if (newChangeIndex >= change[1] - indexDiff) //Si on est apprès dans le texte
    //             newChange[1] -= change[2].length;
    //           //On enlève la taille de la suppression
    //         }
    //         indexDiff -= change[2].length;  //On enlève à l'index à la taille du changement
    //       default:
    //         break;
    //     }
    //   }
    // }
    let content: string = doc.content;
    let stepIndex: number = 0;
    //Pour chaque nouveau changement on fait la mise à jour à partir du packet modifié par l'agorithme ci-dessus
    for (const change of packet.changes) {
      switch (change[0]) {
        case 1:  
          content = content.insert(change[1] + stepIndex, change[2]);
          break;
        case -1:
          content = content.delete(change[1] + stepIndex, change[2].length);
          stepIndex -= change[2].length;
          break;
        case 2:
          content = change[2];
          stepIndex = change[2].length;
        default: break;
      }
    }
    doc.content = content;
    doc.updated = false;
    const newId = doc.addUpdate(packet.changes, packet.clientId, packet.clientUpdateId);
    return [newId, packet.changes];
  }

  public getLastUpdateDoc(docId: number): Map<string, number> {
    return this.documents.find(el => el.docId == docId).clientsUpdateId;
  }

  public async saveDocs() {
    for (const doc of this.documents) {
      if (!doc.updated) {
        this.logger.log("Register cache for", this.Table.name, ":", doc.docId, doc.content);
        await this.Table.update(doc.docId, { content: doc.content });
        doc.updated = true;
      }
    }
  }

  private isDocCached(id: number): boolean {
    return this.documents.find(el => el.docId == id) != null;
  }
}
