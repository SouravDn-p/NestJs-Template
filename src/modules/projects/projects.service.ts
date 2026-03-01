import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-user.dto';
import { CloudinaryService } from 'src/services/cloudinary/cloudinary.service';
import { CreateProjectResponse, SafeProject } from './schemas/project.types';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  async create(
    createProjectDto: CreateProjectDto,
    imageUrl: string,
  ): Promise<CreateProjectResponse> {
    const project = await this.projectModel.create({
      ...createProjectDto,
      image: imageUrl,
    });

    return {
      _id: project.id,
      title: project.title,
      description: project.description,
      tags: project.tags,
      image: project.image,
      liveUrl: project.liveUrl,
      backendLiveUrl: project.backendLiveUrl ?? null,
      repoUrl: project.repoUrl ?? null,
      backendRepoUrl: project.backendRepoUrl ?? null,
      startingDate: project.startingDate ?? null,
      teamMember: project.teamMember,
      status: project.status,
    };
  }

  async getAllProjects(): Promise<SafeProject[]> {
    const projects = await this.projectModel.find().lean<SafeProject[]>();
    return projects;
  }

  // ─── GET ONE ──────────────────────────────────────────────────────────────
  async findOne(id: string): Promise<SafeProject> {
    const project = await this.projectModel
      .findById(id)
      .lean<SafeProject>()
      .exec();
    if (!project) throw new NotFoundException(`Project #${id} not found`);

    return project;
  }

  // async update(
  //   id: string,
  //   updateProjectDto: UpdateProjectDto,
  //   file: Express.Multer.File | undefined,
  // ): Promise<SafeProject> {
  //   const exist = await this.projectModel.findById(id);
  //   if (!exist) throw new NotFoundException(`Project #${id} not found`);

  //   let imageUrl = exist.image;

  //   // If a new image was uploaded, replace the old one
  //   if (file) {
  //     // 1. Delete old image from Cloudinary to avoid orphaned files
  //     //    Extract publicId from existing URL if needed
  //     //    Or store publicId separately in DB (see note below)
  //     const { url } = await this.cloudinaryService.uploadFile(file, 'projects');
  //     imageUrl = url;
  //   }

  //   // findByIdAndUpdate with { new: true } returns the UPDATED document
  //   const project = await this.projectModel
  //     .findByIdAndUpdate(
  //       id,
  //       { ...updateProjectDto, image: imageUrl },
  //       { new: true },
  //     )
  //     .lean<SafeProject>()
  //     .exec();

  //   return {
  //     _id: project.id,
  //     title: project.title,
  //     description: project.description,
  //     tags: project.tags,
  //     image: project.image,
  //     liveUrl: project.liveUrl,
  //     backendLiveUrl: project.backendLiveUrl ?? null,
  //     repoUrl: project.repoUrl ?? null,
  //     backendRepoUrl: project.backendRepoUrl ?? null,
  //     startingDate: project.startingDate ?? null,
  //     teamMember: project.teamMember,
  //     status: project.status,
  //   };
  // }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException(`Project #${id} not found`);

    // Note: To delete from Cloudinary, you'd need the public_id stored in DB.
    // For now we just delete the DB record.
    // Enhancement: store cloudinaryPublicId in schema and call deleteFile here.

    await this.projectModel.findByIdAndDelete(id);
    return { deleted: true };
  }
}
