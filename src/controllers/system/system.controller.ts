import { AppLogger } from './../../utils/app-logger.util';
import { Logs } from './../../models/logs/logs.entity';
import { Body, Controller, Get, HttpException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserGuard } from 'src/guards/user.guard';
import { GetUser } from 'src/decorators/user.decorator';
import { User } from 'src/models/user/user.entity';
import { GithubService, Release } from 'src/services/github.service';

const versions = ["2.0.42", "2.0.45", "2.0.46", "2.0.47", "2.1.0"];
@Controller('system')
export class SystemController {

  constructor(
    private readonly logger: AppLogger,
    private readonly github: GithubService,
  ) { }

  @Get("check-version")
  public checkAllowedVersions(@Query("version") version: string) {
    return { allowed: versions.includes(version), versions };
  }

  @Get("tauri-update/:target/:version")
  public async getTauriStatus(@Param("target") target: "windows" | "linux", @Param("version") version: string) {
    this.logger.log("Getting Tauri update for target", target, "and version", version);
    if (versions.indexOf(version) !== versions.length - 1) {
      try {
        const release = await this.github.getRelease(target, versions[versions.length - 1]) as TauriRelease;
        release.signature = process.env.RELEASE_PUB_KEY;
        this.logger.log("Got Tauri update! version: ", release.version);
        return release;
      } catch (e) {
        this.logger.error("Failed to get release:", e);
        throw new HttpException("No more versions available", 204);
      }
    } else
      throw new HttpException("No more versions available", 204);
  }


  @Post('bug-report')
  @UseGuards(UserGuard)
  public async bugReport(@Body("data") logs: string, @Body("message") message: string, @GetUser() user: User) {
    await Logs.create({ message, logs, user }).save();
    await this.github.openIssue(message, user.name, logs);
    this.logger.log("Saving logs for bug report with user", user.id);
  }
}

interface TauriRelease extends Release {
  signature: string;
}
