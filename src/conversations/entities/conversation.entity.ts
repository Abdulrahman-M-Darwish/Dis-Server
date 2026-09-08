import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Message } from 'src/messages/entities/message.entity';
import { User } from 'src/users/entities/user.entity';

export enum ConversationType {
  'PRIVATE' = 'PRIVATE',
  'GROUP' = 'GROUP',
}

export class ParticipantMetadata {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId!: string;

  @Prop({ type: Date, default: Date.now })
  lastReadAt!: Date;
}

@Schema({ timestamps: true })
export class Conversation {
  _id!: string;
  @Prop({ required: true, enum: ConversationType })
  type!: ConversationType;

  // Group chats have names and avatars; private chats derive them from the recipient's user profile
  @Prop({ default: '' })
  groupName?: string;

  @Prop({ default: '' })
  groupAvatarUrl?: string;

  // List of all members in this conversation
  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true,
  })
  participants!: User[] | string[];

  // Group creators/admins (applicable only if type is 'group')
  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  admins?: User[] | string[];

  // CRUCIAL: Storing the last message ID directly in the conversation.
  // This allows you to render the chat list view instantly without querying the entire messages collection.
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null })
  lastMessage?: Message | string;

  // CRUCIAL: Maps each user to their last read timestamp
  @Prop({
    type: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        lastReadAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  unreadMetaData!: ParticipantMetadata[];
}

export const conversationSchema = SchemaFactory.createForClass(Conversation);

// Performance Index: Speeds up finding all chats a specific user is currently in.
conversationSchema.index({ participants: 1 });
