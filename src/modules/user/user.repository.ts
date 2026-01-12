// In Mongoose-based applications, the repository pattern is typically implemented
// within the service layer itself. The UserService already acts as a repository.
// This file is kept for architectural completeness and future enhancements.
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  // This class can be extended with raw database operations if needed
  // For now, the UserService serves as the repository
}
