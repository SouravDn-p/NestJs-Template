import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UserWithoutPassword } from './schemas/user.types';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user
    const createdUser = new this.userModel({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      password: createUserDto.password,
      role: createUserDto.role || UserRole.USER,
    });

    const savedUser = await createdUser.save();

    // Return user without password
    const userObject = savedUser.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = userObject as {
      password: string;
      _id: import('mongoose').Types.ObjectId;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      isActive: boolean;
      refreshToken?: string;
    };
    return {
      _id: result._id.toString(),
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      role: result.role,
      isActive: result.isActive,
      refreshToken: result.refreshToken,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserWithoutPassword | null> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) return null;
    const userObject = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = userObject as {
      password: string;
      _id: import('mongoose').Types.ObjectId;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      isActive: boolean;
      refreshToken?: string;
    };
    return {
      _id: result._id.toString(),
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      role: result.role,
      isActive: result.isActive,
      refreshToken: result.refreshToken,
    };
  }

  async findOne(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
    });
  }

  async findAll(): Promise<UserWithoutPassword[]> {
    const users = await this.userModel.find().select('-password').exec();
    return users.map((user) => {
      const userObject = user.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _password, ...result } = userObject as {
        password: string;
        _id: import('mongoose').Types.ObjectId;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        isActive: boolean;
        refreshToken?: string;
      };
      return {
        _id: result._id.toString(),
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        role: result.role,
        isActive: result.isActive,
        refreshToken: result.refreshToken,
      };
    });
  }
}
