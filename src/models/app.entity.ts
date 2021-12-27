import { BaseEntity, DeepPartial, FindOneOptions } from 'typeorm';

export abstract class AppEntity extends BaseEntity implements PrimaryColumn {

  constructor(id?: string | number) {
    super();
    if (id)
      this.id = id;
  }

  id: string | number;

  public static async findOneOrCreate<T extends AppEntity>(options: FindOneOptions<T>, entityLike?: DeepPartial<T>): Promise<T> {
    return await this.findOne<T>(options) ?? this.create<T>(entityLike).save()
  }

  public static async exists<T extends AppEntity>(options: FindOneOptions<T>): Promise<boolean> {
    return (await this.findOne<T>(options)) != null;
  }
}

export interface PrimaryColumn {
  id: number | string;
}