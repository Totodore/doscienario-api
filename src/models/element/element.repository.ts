
import { AppRepository } from "../app.repository";
import { IElementEntity } from "./element.entity";
import { Project } from "../project/project.entity";
import { Tag } from "../tag/tag.entity";
import { User } from "../user/user.entity";
import { FindOptionsWhere } from "typeorm";

export abstract class ElementRepository<T extends IElementEntity> extends AppRepository<T> {

  public async rename(id: number, title: string) {
    //@ts-ignore
    return super.update(id, { title });
  }

  public async updateColor(id: number, color: string) {
    return super.update(id, { color: () => `'${color}'` });
  }

  public async addTag(id: number, title: string, projectId: number, userId: string) {
    let el = await this.findOne({ where: { id } as FindOptionsWhere<T>, relations: ["tags"] });
    let tag = (await Tag.findOneBy({ title, projectId })) ?? await Tag.create({
      title,
      project: new Project(projectId),
      createdBy: new User(userId)
    }).save();
    await this.createQueryBuilder().relation("tags").of(el).add(tag);
    return { el, tag };
  }

  public async removeTag(id: number, title: string, projectId: number) {
    const el = await this.findOne({ where: { id } as FindOptionsWhere<T>, relations: ["tags"] });
    await this.createQueryBuilder().relation("tags").of(el).remove(await Tag.findOne({ where: { title, project: { id: projectId } } }));
  }

}