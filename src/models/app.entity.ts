import { BaseEntity, DeepPartial, FindOneOptions, getManager, SaveOptions } from 'typeorm';

export abstract class AppEntity extends BaseEntity {

  public static async findOneOrCreate<T extends AppEntity>(options: FindOneOptions<T>, entityLike?: DeepPartial<T>): Promise<T> {
    return await this.findOne<T>(options) ?? this.create<T>(entityLike);
  }

  public static async exists<T extends AppEntity>(options: FindOneOptions<T>): Promise<boolean> {
    return (await this.findOne<T>(options)) !== null;
  }
} 