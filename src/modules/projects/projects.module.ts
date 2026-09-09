import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CloudinaryModule } from 'src/services/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
