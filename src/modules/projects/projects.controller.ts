import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ApiResponse } from 'src/common/types/global';
import { imageMulterOptions } from 'src/config/multer.config';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProjectDto } from './dto/create-user.dto';
import { CloudinaryService } from 'src/services/cloudinary/cloudinary.service';
import { Public } from 'src/common/decorators/public.decorator';
import { SafeProject } from './schemas/project.types';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectService: ProjectsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async getProjects(): Promise<ApiResponse<SafeProject[]>> {
    const projects = await this.projectService.getAllProjects();
    return ApiResponse.success(projects);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<ApiResponse<SafeProject>> {
    const data = await this.projectService.findOne(id);
    return ApiResponse.success(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', imageMulterOptions))
  async createProject(
    @Body() createUserDto: CreateProjectDto,
    @UploadedFile()
    File: Express.Multer.File,
  ) {
    if (!File) {
      throw new BadRequestException('image is required');
    }

    const upload = await this.cloudinaryService.uploadFile(File, 'projects');

    const imageUrl = upload.url;

    const project = await this.projectService.create(createUserDto, imageUrl);

    return ApiResponse.success(project);
  }

  // ─── DELETE /projects/:id ────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    const data = await this.projectService.delete(id);
    return ApiResponse.success(data);
  }
}
