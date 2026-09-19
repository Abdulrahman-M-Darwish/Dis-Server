import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/users/entities/user.entity';

export enum FriendRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export type FriendRequestDocument = FriendRequest & Document;

@Schema({ timestamps: true })
export class FriendRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender!: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiver!: Types.ObjectId | User;

  @Prop({
    type: String,
    enum: FriendRequestStatus,
    default: FriendRequestStatus.PENDING,
  })
  status!: FriendRequestStatus;

  _id!: string;
}

export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequest);

// Compound index to ensure a unique request pair between two users
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
