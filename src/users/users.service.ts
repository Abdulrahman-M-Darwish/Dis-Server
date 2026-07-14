import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import mongoose, { DeleteResult, Model } from 'mongoose';
import { User } from './entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import 'dotenv/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  private hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: Number(process.env.ARGON_MEMORY),
      timeCost: Number(process.env.ARGON_TIME),
      parallelism: Number(process.env.ARGON_PARALLELISM),
    });
  }

  async create(createUserDto: CreateUserDto) {
    const passwordHash = await this.hashPassword(createUserDto.passwordHash);
    const createdUser = await this.userModel.create({
      ...createUserDto,
      passwordHash,
    });
    return createdUser;
  }

  // findAll() {
  //   return `This action returns all users`;
  // }

  async findOne(id: string) {
    // idk why i get error when i put _id in the $or with email and name so i separated it
    const user = await this.userModel.findOne(
      mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { $or: [{ email: id }, { name: id }] },
    );
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.passwordHash)
      updateUserDto.passwordHash = await this.hashPassword(
        updateUserDto.passwordHash,
      );

    const updatedUser = await this.userModel.updateOne(
      { _id: id },
      updateUserDto,
    );
    return updatedUser;
  }

  async remove(id: string): Promise<DeleteResult> {
    return await this.userModel.deleteOne({ _id: id });
  }
}
