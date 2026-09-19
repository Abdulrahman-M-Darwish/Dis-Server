// src/friends/friends.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/users/entities/user.entity';
import {
  FriendRequest,
  FriendRequestDocument,
  FriendRequestStatus,
} from './entities/friend.entity';
import { ConversationsService } from 'src/conversations/conversations.service';
import {
  Conversation,
  ConversationType,
} from 'src/conversations/entities/conversation.entity';
import { FriendsGateway } from './friends.gateway';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(FriendRequest.name)
    private friendRequestModel: Model<FriendRequestDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    private readonly conversationsService: ConversationsService,
    private readonly friendsGateway: FriendsGateway,
  ) {}

  // 1. Send Friend Request
  async sendFriendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself.',
      );
    }

    const receiver = await this.userModel.findById(receiverId);
    if (!receiver) {
      throw new NotFoundException('User not found.');
    }

    const sender = await this.userModel.findById(senderId);
    if (!sender) {
      throw new NotFoundException('User not found.');
    }

    // Check if already friends
    if (receiver.friends.map((f) => f.toString()).includes(senderId)) {
      throw new BadRequestException('You are already friends with this user.');
    }

    // Check existing request in either direction
    const existingRequest = await this.friendRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === FriendRequestStatus.PENDING) {
        throw new ConflictException('A friend request is already pending.');
      }
      // Reset if previously declined/canceled
      existingRequest.sender = new Types.ObjectId(senderId);
      existingRequest.receiver = new Types.ObjectId(receiverId);
      existingRequest.status = FriendRequestStatus.PENDING;
      const savedRequest = await existingRequest.save();
      this.friendsGateway.sendFriendRequest(
        senderId,
        receiverId,
        savedRequest._id.toString(),
        sender,
        receiver,
      );
      return savedRequest;
    }
    const createdRequest = await this.friendRequestModel.create({
      sender: senderId,
      receiver: receiverId,
      status: FriendRequestStatus.PENDING,
    });
    this.friendsGateway.sendFriendRequest(
      senderId,
      receiverId,
      createdRequest._id.toString(),
      sender,
      receiver,
    );
    return createdRequest;
  }

  // 2. Accept Friend Request
  async acceptFriendRequest(requestId: string, userId: string) {
    const request = await this.friendRequestModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Friend request not found.');
    }

    if ((request.receiver as Types.ObjectId).toString() !== userId) {
      throw new BadRequestException(
        'You are not authorized to accept this request.',
      );
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending.');
    }

    // Update status to ACCEPTED
    request.status = FriendRequestStatus.ACCEPTED;
    const newRequest = await request.save();

    // Add each other to friends array
    const sender = await this.userModel.findByIdAndUpdate(request.sender, {
      $addToSet: { friends: request.receiver },
    });
    const receiver = await this.userModel.findByIdAndUpdate(request.receiver, {
      $addToSet: { friends: request.sender },
    });
    const conversation = await this.conversationsService.create({
      participants: [
        (request.receiver as Types.ObjectId).toString(),
        (request.sender as Types.ObjectId).toString(),
      ],
      type: ConversationType.PRIVATE,
    });
    this.friendsGateway.acceptFriendRequest(
      sender!,
      receiver!,
      newRequest._id.toString(),
      conversation as Conversation,
    );

    return newRequest;
  }

  // 3. Decline / Cancel Request
  async declineOrCancelRequest(requestId: string, userId: string) {
    const request = await this.friendRequestModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Friend request not found.');
    }

    // Ensure action is taken by sender or receiver
    if (
      (request.sender as Types.ObjectId).toString() !== userId &&
      (request.receiver as Types.ObjectId).toString() !== userId
    ) {
      throw new BadRequestException('Unauthorized action.');
    }
    await this.friendRequestModel.findByIdAndDelete(requestId);
    this.friendsGateway.declineOrCancelRequest(
      (request.sender as Types.ObjectId).toString(),
      (request.receiver as Types.ObjectId).toString(),
      request._id.toString(),
    );
    return { requestId: request._id };
  }

  // 4. Remove Friend (Unfriend)
  async unfriend(userId: string, friendId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { friends: friendId },
    });

    await this.userModel.findByIdAndUpdate(friendId, {
      $pull: { friends: userId },
    });

    const conversation = await this.conversationModel.findOne({
      type: ConversationType.PRIVATE,
      participants: { $all: [userId, friendId] },
    });
    if (conversation) {
      await this.conversationModel.deleteOne({ _id: conversation._id });
    }

    // Remove any historical friend request between them
    await this.friendRequestModel.deleteOne({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId },
      ],
    });

    this.friendsGateway.unfriend(
      userId,
      friendId,
      conversation?._id.toString(),
    );

    return { message: 'Friend removed successfully.' };
  }

  // 5. Get List of Friends
  async getFriends(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('friends', 'username name avatarUrl')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user.friends;
  }

  // 6. Get Pending Requests (Incoming & Outgoing)
  async getPendingRequests(userId: string) {
    const incoming = await this.friendRequestModel
      .find({ receiver: userId, status: FriendRequestStatus.PENDING })
      .populate('sender', 'username name avatarUrl')
      .exec();

    const outgoing = await this.friendRequestModel
      .find({ sender: userId, status: FriendRequestStatus.PENDING })
      .populate('receiver', 'username name avatarUrl')
      .exec();

    return { incoming, outgoing };
  }
}
