import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GetUser, GetUserId } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { Project } from 'src/models/project.entity';
import { User } from 'src/models/user.entity';
import { AppLogger } from 'src/utils/app-logger.service';
import { ProjectAddDto } from './project-add.dto';
import { ProjectUserDto } from './project-user.dto';

@Controller('project')
@UseGuards(UserGuard)
export class ProjectController {

  constructor(private readonly _logger: AppLogger) {}

  @Get("/:id")
  async getProject(@Param("id") id: number, @GetUser({ joinProjects: true }) user: User): Promise<Project> {
    this._logger.log(JSON.stringify(user.projects));
    return await Project.findOne(id, { relations: ["users", "createdBy", "tags", "documents.images", "blueprints"] });
  }

  @Post()
  async createProject(@Body() body: ProjectAddDto, @GetUser() user: User): Promise<Project> {
    if (await Project.exists({ where: { name: body.name } }))
      throw new BadRequestException();
    const project = Project.create({ name: body.name, createdBy: user });
    project.users = [user];
    return project.save();
  }

  @Post("/user")
  async addUser(@Body() body: ProjectUserDto, @GetUser({ joinProjects: true }) user: User): Promise<Project> {
    let project: Project = user.projects.find(el => el.id == body.projectId);
    if (!project)
      throw new ForbiddenException;
    this._logger.log(JSON.stringify(project));
    project = await Project.findOne(project.id, { relations: ["users"] });
    project.users.push(await User.findOne(body.userId));
    return await project.save();
  }
}
