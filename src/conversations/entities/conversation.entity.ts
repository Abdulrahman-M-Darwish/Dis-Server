import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { Message } from 'src/messages/entities/message.entity';
import { User } from 'src/users/entities/user.entity';

export enum ConversationType {
  'PRIVATE' = 'PRIVATE',
  'GROUP' = 'GROUP',
}

@Schema({ _id: false })
export class ParticipantMetadata {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  })
  lastReadMessageId!: string | null;

  @Prop({ default: 0, required: true })
  unreadCount!: number;

  @Prop({ default: null })
  clearedMessageId!: string;
}

export const participantMetadataSchema =
  SchemaFactory.createForClass(ParticipantMetadata);

@Schema({ timestamps: true })
export class Conversation {
  _id!: string;
  @Prop({ required: true, enum: ConversationType })
  type!: ConversationType;

  // Group chats have names and avatars; private chats derive them from the recipient's user profile
  @Prop({ default: '' })
  groupName?: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ default: '' })
  groupAvatarUrl?: string;

  // List of all members in this conversation
  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true,
  })
  participants!: User[] | string[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  admins?: Types.ObjectId[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null })
  lastMessage?: Message | string;

  @Prop({
    type: [participantMetadataSchema],
    required: true,
    default: [],
  })
  participantsMetadata!: ParticipantMetadata[];
}

export const conversationSchema = SchemaFactory.createForClass(Conversation);

conversationSchema.index({ participants: 1, updatedAt: -1 });
