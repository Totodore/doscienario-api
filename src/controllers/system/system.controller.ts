import { AppLogger } from './../../utils/app-logger.util';
import { Logs } from './../../models/logs/logs.entity';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserGuard } from 'src/guards/user.guard';
import { GetUser } from 'src/decorators/user.decorator';
import { User } from 'src/models/user/user.entity';

@Controller('system')
export class SystemController {

  constructor(
    private readonly logger: AppLogger,
  ) { }

  @Get("check-version")
  public checkAllowedVersions(@Query("version") version: string) {
    const versions = ["2.0.42", "2.0.45", "2.0.46", "2.0.47"];
    return { allowed: versions.includes(version), versions };
  }

  @Post('bug-report')
  @UseGuards(UserGuard)  
  public async bugReport(@Body("data") logs: string, @Body("message") message: string, @GetUser() user: User) {
    await Logs.create({ message, logs, user }).save();
    this.logger.log("Saving logs for bug report with user", user.id);
  }
}
