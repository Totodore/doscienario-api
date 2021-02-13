import { Injectable, OnModuleInit } from '@nestjs/common';

import * as path from 'path';
import * as fs from "fs-extra";
import FileType from "file-type";
import { AppLogger } from 'src/utils/app-logger.service';
@Injectable()
export class FileService implements OnModuleInit {

  private _baseRoute: string;

  constructor(private readonly _logger: AppLogger) { }

  async onModuleInit() {
    this._baseRoute = path.resolve("./data/files");
    await fs.ensureDir(this._baseRoute);
		this._logger.log("Base Image Route", this._baseRoute);
  }

	public getFile(filePath: string): Buffer {
    return fs.readFileSync(path.join(this._baseRoute, filePath));
  }

  public async writeFile(file: Buffer, filePath: string): Promise<string> {
    filePath = path.join(this._baseRoute, filePath);
    fs.ensureDirSync(filePath);
    fs.writeFileSync(filePath, file);
    return (await FileType.fromBuffer(file)).mime;
  }

  public removeFile(filePath: string) {
    filePath = path.join(this._baseRoute, filePath);
    fs.removeSync(filePath);
  }

  public moveFile(from: string, to: string) {
    from = path.join(this._baseRoute, from);
    to = path.join(this._baseRoute, to);
    fs.ensureDirSync(to);
    fs.moveSync(from, to);
  }

  public copyFile(from: string, to: string) {
    from = path.join(this._baseRoute, from);
    to = path.join(this._baseRoute, to);
    fs.ensureDirSync(to);
    fs.copyFileSync(from, to);
  }

  public createDir(directory: string) {
    directory = path.join(this._baseRoute, directory);
    fs.ensureDirSync(path.join(this._baseRoute, directory));
  }

}
