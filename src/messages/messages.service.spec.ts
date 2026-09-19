import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { RedisService } from 'src/redis/redis.service';

describe('MessagesService', () => {
  let service: MessagesService;

  const findMock = jest.fn();
  const modelMock = {
    find: findMock,
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: MessagesGateway,
          useValue: { broadcastNewMessage: jest.fn(), update: jest.fn() },
        },
        {
          provide: getModelToken('Message'),
          useValue: modelMock,
        },
        {
          provide: getModelToken('Conversation'),
          useValue: {},
        },
        {
          provide: RedisService,
          useValue: { sMembers: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('filters cleared messages by message ID cutoff instead of createdAt', async () => {
    const clearedMessageId = new Types.ObjectId().toHexString();
    const populateChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    findMock.mockReturnValue(populateChain);

    await service.findAll({
      conversationId: '507f1f77bcf86cd799439011',
      clearedMessageId,
    });

    expect(findMock).toHaveBeenCalledWith({
      conversationId: '507f1f77bcf86cd799439011',
      _id: { $gt: new Types.ObjectId(clearedMessageId) },
    });
    expect(findMock.mock.calls[0][0]).not.toHaveProperty('createdAt');
  });
});
