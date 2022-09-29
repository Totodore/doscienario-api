import { WriteElementIn } from './../sockets/models/in/element.in';
import { AppLogger } from './../utils/app-logger.util';
import { ContentElementEntity } from 'src/models/element/element.entity';
import { Change, ElementStore } from 'src/sockets/models/out/element.out';
import crc32 from 'crc/calculators/crc32';

export class CacheUtil {

  private elements: ElementStore[] = [];
  
  constructor(
    private readonly logger: AppLogger,
    private readonly Table: typeof ContentElementEntity,
  ) {
    setInterval(() => this.saveElements(), 1000 * 30);
  }

  public async registerElement(element: ElementStore): Promise<[number, string]> {
    if (!this.isElementCached(element.elementId)) {
      this.logger.log("Cache updated, new", this.Table.name, element.elementId);
      element.content = (await this.Table.findOne({ where: { id: element.elementId }, select: ["content", "id"] })).content ?? '';
      this.elements.push(element);
    }
    const elementEl = this.elements.find(el => el.elementId == element.elementId);
    return [elementEl.elementId, elementEl.content];
  }
  public checkCRC(id: number, crc: number): boolean {
    const element = this.elements.find(el => el.elementId == id);
    if (!element)
      return false;
    return crc == crc32(Buffer.from(element.content));
  }
  public async unregisterElement(id: number, all = false) {
    if (!all) {
      const element = this.elements.find(el => el.elementId == id);
      if (!element) return;
      if (!element.updated)
        await this.Table.update(element.elementId, { content: element.content });
      this.elements.splice(this.elements.indexOf(element), 1);
    } else {
      for (const element of this.elements) {
        if (element.parentId === id)
          await this.unregisterElement(element.elementId);
      }
    }
    this.logger.log("Cache updated, removed", this.Table.name, id);
  }

  /**
   * Update a element with new changes
   * if there is an addition it adds to the elements,
   * if there is no addition it stores from where to where there is one
   * [Sorcellerie qui gère le multi éditing]
   */
  public updateElement(packet: WriteElementIn): [number, Change[]] {
    //On récupère le element
    const element = this.elements.find(el => el.elementId == packet.elementId);
    //On part du dernier ID du packet recu jusqu'au dernière id du element, 
    // for (let updateIndex = packet.lastUpdateId + 1; updateIndex <= element.lastId; updateIndex++) {
    //   //On récupère chaque update depuis le dernière id du packet jusqu'au dernier id actuel
    //   const update = element.updates.get(updateIndex);
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
    let content: string = element.content || "";
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
    element.content = content;
    element.updated = false;
    let newId: number;
    return [newId, packet.changes];
  }

  public getLastUpdateElement(elementId: number): Map<string, number> {
    return this.elements.find(el => el.elementId == elementId).clientsUpdateId;
  }

  public async saveElements() {
    for (const element of this.elements) {
      if (!element.updated) {
        this.logger.log("Register cache for", this.Table.name, ":", element.elementId, element.content);
        await this.Table.update(element.elementId, { content: element.content });
        element.updated = true;
      }
    }
  }

  private isElementCached(id: number): boolean {
    return this.elements.find(el => el.elementId == id) != null;
  }
}
