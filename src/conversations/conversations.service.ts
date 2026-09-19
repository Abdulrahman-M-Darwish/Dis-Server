import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Conversation } from './entities/conversation.entity';
import { Model } from 'mongoose';
import { Message } from 'src/messages/entities/message.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationsModel: Model<Conversation>,
    @InjectModel(Message.name)
    private readonly messagesModel: Model<Message>,
  ) {}
  async create(createConversationDto: CreateConversationDto) {
    const conversation = await this.conversationsModel.create({
      ...createConversationDto,
      participantsMetadata: createConversationDto.participants.map(
        (userId) => ({
          userId,
          unreadCount: 0,
          lastReadMessageId: null,
        }),
      ),
    });

    return this.findOne(conversation._id.toString());
  }

  // find all user conversations
  async findAll(userId: string) {
    const conversations = await this.conversationsModel
      .find({ participants: userId })
      .select({
        _id: 1,
        type: 1,
        groupName: 1,
        groupAvatarUrl: 1,
        participants: 1,
        lastMessage: 1,
        description: 1,
        admins: 1,
        participantsMetadata: { $elemMatch: { userId } },
      })
      .populate('participants', '_id name username avatarUrl status')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    return conversations;
  }

  async findOne(id: string) {
    const conversation = await this.conversationsModel
      .findOne({ _id: id })
      .select(
        '_id type groupName groupAvatarUrl lastMessage admins description',
      )
      .populate('participants', '_id name username avatarUrl status')
      .populate('lastMessage')
      .lean();
    return conversation;
  }

  async update(
    id: string,
    {
      participants,
      transferOwnershipTo,
      ...updateConversationDto
    }: UpdateConversationDto,
  ) {
    // let conversation: Conversation | null = null
    const filters = {};
    if (participants) {
      const conversation = await this.conversationsModel
        .findOne({ _id: id })
        .select('_id participants admins')
        .lean();
      const conversationParticipantsIds = (
        conversation?.participants as string[]
      ).map((p) => p.toString());
      const metadataObjects = participants.map((userId) => ({
        userId,
        lastReadMessageId: null,
        unreadCount: 0,
      }));

      if (participants.every((p) => conversationParticipantsIds?.includes(p))) {
        filters['$pull'] = {
          participants: { $in: participants },
          participantsMetadata: { userId: { $in: participants } },
        };
      } else {
        filters['$addToSet'] = {
          participants: { $each: participants },
          participantsMetadata: { $each: metadataObjects },
        };
      }
    }

    const setUpdates = {
      ...(transferOwnershipTo ? { admins: [transferOwnershipTo] } : {}),
      ...updateConversationDto,
    };

    await this.conversationsModel.findOneAndUpdate(
      { _id: id },
      {
        ...(Object.keys(setUpdates).length > 0 && { $set: setUpdates }),
        ...filters,
      },
    );

    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const conversation = await this.conversationsModel
      .findById(id)
      .select('participants admins')
      .lean();
    if (!conversation?.admins?.some((admin) => String(admin) === userId))
      throw new UnauthorizedException(
        'Only admins allowed to delete the conversation',
      );
    const result = await this.conversationsModel.deleteOne({ _id: id });

    return {
      conversationId: id,
      participantIds: ((conversation?.participants ?? []) as unknown[]).map(
        (participant) => {
          if (
            participant &&
            typeof participant === 'object' &&
            '_id' in participant
          ) {
            return String((participant as { _id: unknown })._id);
          }
          return String(participant);
        },
      ),
      deletedCount: result.deletedCount,
    };
  }

  async clearChat(conversationId: string, userId: string) {
    const conversation = await this.conversationsModel
      .findOne({ _id: conversationId })
      .select({
        participants: 1,
        participantsMetadata: { $elemMatch: { userId } },
      });

    if (!conversation || conversation.participantsMetadata.length === 0) {
      throw new UnauthorizedException('You are not a participant');
    }

    const lastMessage = await this.messagesModel
      .findOne({ conversationId })
      .sort({ createdAt: -1, _id: -1 })
      .select('_id')
      .lean();

    if (
      !lastMessage ||
      lastMessage._id == conversation.participantsMetadata[0].clearedMessageId
    )
      return;

    await this.conversationsModel.updateOne(
      {
        _id: conversationId,
        'participantsMetadata.userId': userId,
      },
      {
        $set: {
          'participantsMetadata.$.unreadCount': 0,
          'participantsMetadata.$.clearedMessageId': lastMessage._id,
        },
      },
    );

    return { message: 'Messages Cleared Successfully' };
  }

  async markAsRead(
    conversationId: string,
    userId: string,
    latestMessageId: string,
  ) {
    await this.conversationsModel.updateOne(
      {
        _id: conversationId,
        'participantsMetadata.userId': userId,
      },
      {
        $set: {
          'participantsMetadata.$.unreadCount': 0,
          'participantsMetadata.$.lastReadMessageId': latestMessageId,
        },
      },
    );
  }
}
