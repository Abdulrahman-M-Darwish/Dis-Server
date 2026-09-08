import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, messagesSchema } from './entities/message.entity';
import { MessagesGateway } from './messages.gateway';
import {
  Conversation,
  conversationSchema,
} from 'src/conversations/entities/conversation.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: messagesSchema },
      { name: Conversation.name, schema: conversationSchema },
    ]),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
