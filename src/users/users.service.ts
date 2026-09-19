import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import mongoose, { DeleteResult, Model, Types } from 'mongoose';
import { User } from './entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import 'dotenv/config';
import { SearchUsersDto } from './dto/search-users.dto';
import {
  FriendRequest,
  FriendRequestDocument,
  FriendRequestStatus,
} from 'src/friends/entities/friend.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
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

  async findAll(
    currentUserId: string,
    { search, beforeId, limit }: SearchUsersDto,
  ) {
    const query: Record<string, any> = {
      // Exclude the current logged-in user from search results
      _id: { $ne: currentUserId },
    };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query['$or'] = [
        { name: searchRegex },
        { username: searchRegex },
        { bio: searchRegex },
      ];
    }

    if (beforeId) {
      if (!Types.ObjectId.isValid(beforeId)) {
        throw new BadRequestException('Invalid user cursor ID format');
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      query['_id'] = { ...query['_id'], $gt: new Types.ObjectId(beforeId) };
    }

    // 1. Fetch matching users
    const users = await this.userModel
      .find(query)
      .sort({ _id: 1 })
      .limit(limit)
      .select('_id name username avatarUrl')
      .lean(); // .lean() returns plain JS objects so we can easily attach properties

    if (!users.length) return [];

    const targetUserIds = users.map((u) => u._id.toString());

    // 2. Fetch relevant friend requests involving the current user and the found users
    const requests = await this.friendRequestModel
      .find({
        $or: [
          { sender: currentUserId, receiver: { $in: targetUserIds } },
          { sender: { $in: targetUserIds }, receiver: currentUserId },
        ],
      })
      .lean();

    // 3. Map requests by target user ID for O(1) lookup
    const requestMap = new Map<
      string,
      { status: string; isSender: boolean; id: string }
    >();
    for (const req of requests) {
      const isSender = req.sender.toString() === currentUserId;
      const searchedUserId = isSender
        ? req.receiver.toString()
        : req.sender.toString();

      requestMap.set(searchedUserId, {
        id: req._id.toString(),
        status: req.status,
        isSender,
      });
    }

    // 4. Combine relationship status with user profiles
    return users.map((user) => {
      const userIdStr = user._id.toString();
      const request = requestMap.get(userIdStr);

      // Check if already in current user's friends array (if friends array contains ObjectIds)
      const isFriend = user.friends?.some(
        (friendId) => friendId.toString() === currentUserId,
      );

      let relationship = 'NONE'; // 'NONE' | 'FRIEND' | 'SENT_PENDING' | 'RECEIVED_PENDING' | 'DECLINED'

      if (isFriend) {
        relationship = 'FRIEND';
      } else if (request) {
        if (request.status === 'PENDING') {
          relationship = request.isSender ? 'SENT_PENDING' : 'RECEIVED_PENDING';
        } else {
          relationship = request.status; // e.g., 'DECLINED' or 'ACCEPTED'
        }
      }

      return {
        ...user,
        relationship,
        requestId: request?.id,
      };
    });
  }

  async findOne(id: string, currentUserId?: string) {
    const user = await this.userModel
      .findOne(
        mongoose.Types.ObjectId.isValid(id)
          ? { _id: id }
          : { $or: [{ email: id }, { name: id }] },
      )
      .select({ passwordHash: 0 })
      .lean();
    if (currentUserId && currentUserId !== id) {
      const request = await this.friendRequestModel.findOne({
        $or: [
          { sender: currentUserId, receiver: id },
          { sender: id, receiver: currentUserId },
        ],
      });
      const isSender = request?.sender.toString() == currentUserId;
      let relationship = 'NONE';

      const isFriend = user?.friends?.some(
        (friendId) => friendId.toString() === currentUserId,
      );
      if (isFriend) {
        relationship = 'FRIEND';
      } else if (request) {
        if (request.status == FriendRequestStatus.PENDING) {
          relationship = isSender ? 'SENT_PENDING' : 'RECEIVED_PENDING';
        } else {
          relationship = request.status; // e.g., 'DECLINED' or 'ACCEPTED'
        }
      }
      return { ...(user as User), relationship, requestId: request?._id };
    }

    return user;
  }

  async findOneForLogin(email: string) {
    return await this.userModel
      .findOne({ email })
      .select('_id passwordHash')
      .lean();
  }

  async findByIdWithFriends(id: string) {
    return await this.userModel
      .findById(id)
      .select('_id friends')
      .populate({
        path: 'friends',
        // match: { status: UserStatus.ONLINE }, // Filters the populated array
        select: '_id', // Selects specific fields on friends
      })
      .exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.passwordHash)
      updateUserDto.passwordHash = await this.hashPassword(
        updateUserDto.passwordHash,
      );

    await this.userModel.updateOne({ _id: id }, updateUserDto);
    const updatedUser = await this.findOne(id);
    return updatedUser;
  }

  async remove(id: string): Promise<DeleteResult> {
    return await this.userModel.deleteOne({ _id: id });
  }
}
