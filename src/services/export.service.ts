import { Injectable, OnModuleInit } from '@nestjs/common';

import * as path from 'path';
import * as fs from "fs-extra";
import { AppLogger } from 'src/utils/app-logger.util';

@Injectable()
export class ExportService implements OnModuleInit {

  private _baseRoute: string;

  constructor(private readonly _logger: AppLogger) { }

  async onModuleInit() {
    this._baseRoute = path.resolve("./data/export");
    await fs.ensureDir(this._baseRoute);
		this._logger.log("Base Image Route", this._baseRoute);
  }

	public getFile(filePath: string): Buffer {
    return fs.readFileSync(path.join(this._baseRoute, filePath));
  }

  public async writeFile(file: Buffer, id: string) {
    const filePath = path.join(this._baseRoute, id);
    await fs.writeFile(filePath, file);
  }

  public async removeFile(id: string) {
    const filePath = path.join(this._baseRoute, id);
    await fs.remove(filePath);
  }
}
