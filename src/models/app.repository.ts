import { DeepPartial, Repository } from "typeorm";
import { AppEntity } from "./app.entity";

export abstract class AppRepository<T extends AppEntity> extends Repository<T> {

  public async getOne(id: number, relations: string[] = [], select?: (keyof T)[]): Promise<T> {
    return this.findOne(id, {
      relations,
      select
    });
  }

  public async post(data: DeepPartial<T>): Promise<T> {
    return this.create(data).save();
  }


  public async removeById(id: number) {
    return (await this.getOne(id, [], ["id"])).remove();
  }

}