import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './entities/message.entity';
import { Model, Types } from 'mongoose';
import { MessagesGateway } from './messages.gateway';
import { GetMessagesDto } from './dto/get-messages.dto';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { RedisService } from 'src/redis/redis.service';

const MESSAGE_FIELDS =
  '_id conversationId senderId text attachments readBy reply isEdited isForwarded isSystem createdAt updatedAt';
const SENDER_FIELDS = '_id username';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly messagesModel: Model<Message>,
    private readonly messagesGateway: MessagesGateway,
    @InjectModel(Conversation.name)
    private readonly conversationsModel: Model<Conversation>,
    private readonly redisService: RedisService,
  ) {}

  async create(createMessageDto: CreateMessageDto) {
    const activeUsersId = await this.redisService.sMembers(
      `chat:active:${createMessageDto.conversationId}`,
    );
    const createdMessage = await this.messagesModel.create(createMessageDto);
    await createdMessage.populate([
      { path: 'sender', select: SENDER_FIELDS },
      {
        path: 'reply',
        select: MESSAGE_FIELDS,
        populate: { path: 'sender', select: SENDER_FIELDS },
      },
    ]);
    await this.messagesGateway.broadcastNewMessage(createdMessage);
    await this.conversationsModel.updateOne(
      { _id: createMessageDto.conversationId },
      {
        $set: {
          lastMessage: createdMessage._id,
          'participantsMetadata.$[active].unreadCount': 0,
          'participantsMetadata.$[active].lastReadMessageId':
            createdMessage._id,
        },
        $inc: { 'participantsMetadata.$[inActive].unreadCount': 1 },
      },
      {
        arrayFilters: [
          {
            'inActive.userId': {
              $nin: [...activeUsersId, createMessageDto.senderId],
            },
          },
          {
            'active.userId': {
              $in: activeUsersId,
            },
          },
        ],
      },
    );
    return createdMessage;
  }

  async createSystemMessage(
    conversationId: string,
    senderId: string,
    text: string,
  ) {
    return await this.create({
      conversationId,
      senderId,
      text,
      isSystem: true,
    });
  }

  async findAll({
    conversationId,
    beforeMessageId,
    clearedMessageId,
    limit = 20,
  }: GetMessagesDto) {
    const query: { conversationId: string; _id?: object } = {
      conversationId,
    };

    if (beforeMessageId) {
      // Safely validate the cursor ID format before querying MongoDB
      if (!Types.ObjectId.isValid(beforeMessageId)) {
        throw new BadRequestException('Invalid message cursor ID format');
      }
      query._id = { $lt: new Types.ObjectId(beforeMessageId) };
    }

    if (clearedMessageId) {
      if (!Types.ObjectId.isValid(clearedMessageId)) {
        throw new BadRequestException('Invalid cleared message ID format');
      }

      query._id = {
        ...(query._id as object),
        $gt: new Types.ObjectId(clearedMessageId),
      };
    }

    const messages = await this.messagesModel
      .find(query)
      .select(MESSAGE_FIELDS)
      .sort({ _id: -1 })
      .populate({
        path: 'reply',
        select: MESSAGE_FIELDS,
        populate: {
          path: 'sender',
          select: SENDER_FIELDS,
        },
      })
      .populate('sender', SENDER_FIELDS)
      .limit(limit);

    return messages.reverse();
  }

  findOne(id: string) {
    return this.messagesModel.findOne({ _id: id });
  }

  async update(id: string, updateMessageDto: UpdateMessageDto) {
    await this.messagesModel.updateOne(
      { _id: id },
      { ...updateMessageDto, isEdited: true },
    );
    const message = await this.findOne(id);
    await this.messagesGateway.update(message as Message);
    return message;
  }

  async remove(id: string) {
    const deletedMessage = await this.messagesModel
      .findOneAndDelete({ _id: id })
      .lean();

    if (!deletedMessage) {
      return;
    }

    const conversationId = deletedMessage.conversationId;

    const [replacementLastMessage, replacementLastReadMessage, conversation] =
      await Promise.all([
        this.messagesModel
          .findOne({
            conversationId,
            _id: { $ne: deletedMessage._id },
          })
          .sort({ createdAt: -1, _id: -1 })
          .select('_id')
          .lean(),

        this.messagesModel
          .findOne({
            conversationId,
            createdAt: { $lt: deletedMessage.createdAt },
          })
          .sort({ createdAt: -1, _id: -1 })
          .select('_id')
          .lean(),

        this.conversationsModel
          .findById(conversationId)
          .select('participantsMetadata lastMessage')
          .lean(),
      ]);

    const unreadParticipantIds = (conversation?.participantsMetadata ?? [])
      .filter((metadata) => {
        if (metadata.unreadCount <= 0) {
          return false;
        }

        if (!metadata.lastReadMessageId) {
          return true;
        }

        // Prefer comparing timestamps or a sequence value instead.
        return String(metadata.lastReadMessageId) < String(deletedMessage._id);
      })
      .map((metadata) => metadata.userId);

    const operations: any[] = [];

    if (unreadParticipantIds.length > 0) {
      operations.push({
        updateOne: {
          filter: { _id: conversationId },
          update: {
            $inc: {
              'participantsMetadata.$[unread].unreadCount': -1,
            },
          },
          arrayFilters: [
            {
              'unread.userId': { $in: unreadParticipantIds },
              'unread.unreadCount': { $gt: 0 },
            },
          ],
        },
      });
    }

    operations.push({
      updateOne: {
        filter: { _id: conversationId },
        update: {
          $set: {
            'participantsMetadata.$[readCursor].lastReadMessageId':
              replacementLastReadMessage?._id ?? null,
          },
        },
        arrayFilters: [
          {
            'readCursor.lastReadMessageId': deletedMessage._id,
          },
        ],
      },
    });

    operations.push({
      updateOne: {
        filter: {
          _id: conversationId,
          lastMessage: deletedMessage._id,
        },
        update: {
          $set: {
            lastMessage: replacementLastMessage?._id ?? null,
          },
        },
      },
    });

    await this.conversationsModel.bulkWrite(operations);

    if (!deletedMessage) {
      return { message: 'message not found' };
    }

    await this.messagesGateway.remove(deletedMessage as Message);

    return { message: 'message Deleted' };
  }
}
