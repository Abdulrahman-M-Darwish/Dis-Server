import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  conversationSchema,
} from './entities/conversation.entity';
import { ConversationsGateway } from './conversations.gateway';
import { Message, messagesSchema } from 'src/messages/entities/message.entity';
import { MessagesModule } from 'src/messages/messages.module';

@Module({
  imports: [
    MessagesModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: conversationSchema },
      { name: Message.name, schema: messagesSchema },
    ]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsGateway],
  exports: [ConversationsService],
})
export class ConversationsModule {}
