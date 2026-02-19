import { CreateUserDto } from './user-dto/create-user-dto';
import { ConflictException, Injectable } from '@nestjs/common';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { SafeUser } from './schemas/userType';
import { GlobalResponse } from '../../common/response/global-response.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    return await this.userModel.findById(id).select('-password -__v').lean();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ email }).select('-__v').lean();
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    if (refreshToken) {
      // Hash the refresh token before storing
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await this.userModel.findByIdAndUpdate(userId, { hashedRefreshToken });
    } else {
      // Clear the refresh token
      await this.userModel.findByIdAndUpdate(userId, {
        hashedRefreshToken: null,
      });
    }
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.hashedRefreshToken) {
      return false;
    }

    return await bcrypt.compare(refreshToken, user.hashedRefreshToken);
  }

  async findAll(): Promise<GlobalResponse<UserDocument[]>> {
    const users = await this.userModel
      .find()
      .select('-password -__v -hashedRefreshToken')
      .lean();
    return {
      data: users,
      message: 'Users retrieved successfully',
    };
  }

  async CreateUser(
    createUserDto: CreateUserDto,
  ): Promise<GlobalResponse<SafeUser>> {
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exist');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const createUser = new this.userModel({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      password: hashedPassword,
      image: createUserDto.image || null,
      role: createUserDto.role || 'user',
    });

    const savedUser = await createUser.save();
    const userObject = savedUser.toObject();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, hashedRefreshToken, ...result } = userObject;

    const safeResult: SafeUser = {
      _id: result._id?.toString() || '',
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      image: result.image || null,
      role: result.role || UserRole.USER,
    };

    return {
      data: safeResult,
      message: 'User created successfully',
    };
  }
}
