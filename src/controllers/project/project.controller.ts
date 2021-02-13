import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { Project } from 'src/models/project.entity';
import { User } from 'src/models/user.entity';
import { serialize } from 'v8';
import { ProjectAddDto } from './project-add.dto';
import { ProjectUserDto } from './project-user.dto';

@Controller('project')
export class ProjectController {

  @Get("/:id")
  @UseGuards(UserGuard)
  async getProject(@Param("id") id: number, @GetUser() user: User): Promise<Project> {
    if (!user.projects?.map(el => el.id)?.includes(id))
      throw new ForbiddenException();
    return await Project.findOne({ relations: ["users", "createdBy", "documents.images", "blueprints.nodes", "tags", "files"], where: { id } });
  }

  @Post()
  @UseGuards(UserGuard)
  async createProject(@Body() body: ProjectAddDto, @GetUser() user: User) {
    await Project.create({ name: body.name, createdBy: user }).save();
  }

  @Post("/user")
  @UseGuards(UserGuard)
  async addUser(@Body() body: ProjectUserDto, @GetUser() user: User) {
    const project = await Project.findOne({ relations: ["users"], where: { id: body.projectId } });
    if (!project.users?.includes(user))
      throw new ForbiddenException();
    project.users.push(await User.findOne(body.userId));
    await project.save();
  }
}
