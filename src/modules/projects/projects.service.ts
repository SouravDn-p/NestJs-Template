import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Project, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CloudinaryService } from '../../services/cloudinary/cloudinary.service';
import { CreateProjectResponse, SafeProject } from './schemas/project.types';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    imageUrl: string,
  ): Promise<CreateProjectResponse> {
    const project = await this.prisma.project.create({
      data: {
        title: createProjectDto.title,
        description: createProjectDto.description,
        tags: this.normalizeTags(createProjectDto.tags),
        image: imageUrl,
        liveUrl: createProjectDto.liveUrl,
        backendLiveUrl: createProjectDto.backendLiveUrl,
        repoUrl: createProjectDto.repoUrl,
        backendRepoUrl: createProjectDto.backendRepoUrl,
        startingDate: createProjectDto.startingDate,
        updateDate: createProjectDto.updateDate,
        teamMember: createProjectDto.teamMember,
        status: createProjectDto.status,
      },
    });

    return this.toSafeProject(project);
  }

  async getAllProjects(): Promise<SafeProject[]> {
    const projects = await this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((project) => this.toSafeProject(project));
  }

  async getProjects(query: ProjectQueryDto): Promise<{
    projects: SafeProject[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, tag, search, page = 1, limit = 10 } = query;
    const where: Prisma.ProjectWhereInput = {};

    if (status) where.status = status;
    if (tag) where.tags = { has: tag };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      projects: projects.map((project) => this.toSafeProject(project)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<SafeProject> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException(`Project #${id} not found`);
    return this.toSafeProject(project);
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    file: Express.Multer.File | undefined,
  ): Promise<SafeProject> {
    const hasUpdateFields = Object.keys(updateProjectDto).length > 0 || file;
    if (!hasUpdateFields) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    const exist = await this.prisma.project.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException(`Project #${id} not found`);

    let imageUrl = exist.image;
    let shouldDeleteOldImage = false;

    if (file) {
      const { url } = await this.cloudinaryService.uploadFile(file, 'projects');
      imageUrl = url;
      shouldDeleteOldImage = true;
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...updateProjectDto,
        ...(updateProjectDto.tags
          ? { tags: this.normalizeTags(updateProjectDto.tags) }
          : {}),
        ...(file ? { image: imageUrl } : {}),
      },
    });

    if (shouldDeleteOldImage && exist.image) {
      try {
        const publicId = this.extractPublicIdFromUrl(exist.image);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      } catch (error) {
        console.error('Failed to delete old image from Cloudinary:', error);
      }
    }

    return this.toSafeProject(project);
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException(`Project #${id} not found`);

    if (project.image) {
      try {
        const publicId = this.extractPublicIdFromUrl(project.image);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      } catch (error) {
        console.error('Failed to delete image from Cloudinary:', error);
      }
    }

    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  private normalizeTags(tags: string[] = []): string[] {
    return tags.map((tag) => {
      if (typeof tag === 'string' && tag.startsWith('"') && tag.endsWith('"')) {
        return tag.slice(1, -1);
      }
      return tag;
    });
  }

  private toSafeProject(project: Project): SafeProject {
    return {
      _id: project.id,
      title: project.title,
      description: project.description,
      tags: this.normalizeTags(project.tags),
      image: project.image,
      liveUrl: project.liveUrl,
      backendLiveUrl: project.backendLiveUrl,
      repoUrl: project.repoUrl,
      backendRepoUrl: project.backendRepoUrl,
      startingDate: project.startingDate,
      teamMember: project.teamMember,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private extractPublicIdFromUrl(url: string): string | null {
    const match = url.match(/\/([^/]+)\.[^.]+$/);
    return match ? match[1] : null;
  }
}


