import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { User } from 'src/users/entities/user.entity';

export class Attachment {
  url!: string;
  fileType!: 'image' | 'video' | 'file';
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Message {
  _id!: string;
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  })
  conversationId!: Conversation | string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId!: string;

  @Prop({ trim: true, default: null })
  text?: string;

  @Prop({ default: [] })
  attachments?: Attachment[];

  // For WhatsApp-style blue double-ticks (Read Receipts)
  // Keeps track of which participants have actually read this specific message.
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  readBy!: User[] | string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
  reply!: Message | string;

  @Prop({ default: false })
  isEdited!: boolean;

  @Prop({ default: false })
  isForwarded!: boolean;

  @Prop({ default: false })
  isSystem!: boolean;

  sender!: User;
  createdAt!: Date;
  updatedAt!: Date;
}

export const messagesSchema = SchemaFactory.createForClass(Message);

// Performance Indexes: Highly crucial for chat apps!
// Indexing conversationId and _id ensures lightning-fast pagination of chat history.
messagesSchema.index({ conversationId: 1, _id: -1, createdAt: 1 });

messagesSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true,
});
