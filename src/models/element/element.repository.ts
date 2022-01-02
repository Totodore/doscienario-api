
import { AppRepository } from "../app.repository";
import { IElementEntity } from "./element.entity";
import { Project } from "../project/project.entity";
import { Tag } from "../tag/tag.entity";
import { User } from "../user/user.entity";

export abstract class ElementRepository<T extends IElementEntity> extends AppRepository<T> {

  public async rename(id: number, title: string) {
    //@ts-ignore
    return super.update(id, { title });
  }

  public async updateColor(id: number, color: string) {
    return super.update(id, { color: () => `'${color}'` });
  }

  public async addTag(id: number, title: string, projectId: number, userId: string) {
    let el = await this.findOne(id, { relations: ["tags"] });
    let tag = await Tag.findOneOrCreate<Tag>({ where: { title } }, {
      title,
      project: new Project(projectId),
      createdBy: new User(userId)
    });
    await this.createQueryBuilder().relation("tags").of(el).add(tag);
    return { el, tag };
  }

  public async removeTag(id: number, title: string) {
    const el = await this.findOne(id, { relations: ["tags"] });
    await this.createQueryBuilder().relation("tags").of(el).remove(await Tag.findOne({ where: { title } }));
  }

}