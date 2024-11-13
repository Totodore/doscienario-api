import { AppLogger } from './../../utils/app-logger.util';
import { Logs } from './../../models/logs/logs.entity';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserGuard } from 'src/guards/user.guard';
import { GetUser } from 'src/decorators/user.decorator';
import { User } from 'src/models/user/user.entity';
import { GithubService } from 'src/services/github.service';

const VERSION = '2.1';
@Controller('system')
export class SystemController {
  constructor(
    private readonly logger: AppLogger,
    private readonly github: GithubService,
  ) {}

  @Get('check-version')
  public checkAllowedVersions(@Query('version') version: string) {
    return { allowed: version.startsWith(VERSION), versions: [VERSION] };
  }

  @Post('bug-report')
  @UseGuards(UserGuard)
  public async bugReport(
    @Body('data') logs: string,
    @Body('message') message: string,
    @GetUser() user: User,
  ) {
    await Logs.create({ message, logs, user }).save();
    await this.github.openIssue(message, user.name, logs);
    this.logger.log('Saving logs for bug report with user', user.id);
  }
}
