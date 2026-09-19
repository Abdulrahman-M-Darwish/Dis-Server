import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import type { Request as RequestT } from 'express';
import { ConversationsGateway } from './conversations.gateway';
import { ConversationType } from './entities/conversation.entity';
import { MessagesService } from 'src/messages/messages.service';

const getParticipantId = (participant: unknown) => {
  if (participant && typeof participant === 'object' && '_id' in participant) {
    return String((participant as { _id: unknown })._id);
  }
  return String(participant);
};

const getParticipantName = (participant: unknown) => {
  if (
    participant &&
    typeof participant === 'object' &&
    'username' in participant
  ) {
    return String((participant as { username: unknown }).username);
  }
  return 'A member';
};

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly conversationsGateway: ConversationsGateway,
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req: RequestT & { user: { userId: string } },
  ) {
    const admins =
      createConversationDto.type == ConversationType.GROUP
        ? [req.user.userId]
        : undefined;

    const conversation = await this.conversationsService.create({
      ...createConversationDto,
      admins,
    });
    if (conversation) {
      this.conversationsGateway.broadcastUpdated(conversation, []);
    }
    return conversation;
  }

  @Get()
  findAll(@Request() req: RequestT & { user: { userId: string } }) {
    return this.conversationsService.findAll(req.user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @Request() req: RequestT & { user: { userId: string } },
  ) {
    const previousConversation = await this.conversationsService.findOne(id);
    const isLeaving =
      updateConversationDto.participants?.length === 1 &&
      updateConversationDto.participants[0] === req.user.userId;
    const isLastAdminLeaving =
      isLeaving &&
      previousConversation?.admins?.length === 1 &&
      String(previousConversation.admins[0]._id) == req.user.userId;

    if (isLastAdminLeaving) {
      const transferOwnershipTo = updateConversationDto.transferOwnershipTo;
      const isValidTransferTarget = previousConversation.participants.some(
        (participant) =>
          getParticipantId(participant) === transferOwnershipTo &&
          getParticipantId(participant) !== req.user.userId,
      );

      if (!transferOwnershipTo || !isValidTransferTarget) {
        throw new BadRequestException(
          'Choose another group member to receive ownership before leaving',
        );
      }
    }

    if (
      !isLeaving &&
      !previousConversation?.admins?.some((a) => String(a) === req.user.userId)
    )
      throw new UnauthorizedException(
        'Only admins allowed to update the conversation',
      );
    const conversation = await this.conversationsService.update(
      id,
      updateConversationDto,
    );
    if (conversation) {
      const previousParticipantIds = (
        (previousConversation?.participants ?? []) as unknown[]
      ).map(getParticipantId);
      const currentParticipantIds = (
        (conversation.participants ?? []) as unknown[]
      ).map(getParticipantId);
      const addedParticipantIds = currentParticipantIds.filter(
        (participantId) => !previousParticipantIds.includes(participantId),
      );
      const removedParticipants = (
        (previousConversation?.participants ?? []) as unknown[]
      ).filter(
        (participant) =>
          !currentParticipantIds.includes(getParticipantId(participant)),
      );

      for (const participantId of addedParticipantIds) {
        const participant = (conversation.participants ?? []).find(
          (candidate) => getParticipantId(candidate) === participantId,
        );
        await this.messagesService.createSystemMessage(
          id,
          req.user.userId,
          `${getParticipantName(participant)} joined the group`,
        );
      }
      for (const participant of removedParticipants) {
        await this.messagesService.createSystemMessage(
          id,
          req.user.userId,
          `${getParticipantName(participant)} left the group`,
        );
      }
      if (
        updateConversationDto.groupName !== undefined &&
        updateConversationDto.groupName !== previousConversation?.groupName
      ) {
        await this.messagesService.createSystemMessage(
          id,
          req.user.userId,
          `Group name changed to ${updateConversationDto.groupName}`,
        );
      }
      if (
        updateConversationDto.groupAvatarUrl !== undefined &&
        updateConversationDto.groupAvatarUrl !==
          previousConversation?.groupAvatarUrl
      ) {
        await this.messagesService.createSystemMessage(
          id,
          req.user.userId,
          'Group avatar changed',
        );
      }
      this.conversationsGateway.broadcastUpdated(
        conversation,
        previousParticipantIds,
      );
    }
    return conversation;
  }

  @Patch('clear/:id')
  async clearChat(
    @Param('id') id: string,
    @Request() req: RequestT & { user: { userId: string } },
  ) {
    const result = await this.conversationsService.clearChat(
      id,
      req.user.userId,
    );
    const conversation = await this.conversationsService.findOne(id);
    if (conversation) {
      this.conversationsGateway.broadcastUpdated(conversation);
    }
    return result;
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: RequestT & { user: { userId: string } },
  ) {
    const result = await this.conversationsService.remove(id, req.user.userId);
    this.conversationsGateway.broadcastDeleted(
      result.conversationId,
      result.participantIds,
    );
    return result;
  }
}
