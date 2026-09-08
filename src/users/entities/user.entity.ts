import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

@Schema({ timestamps: true })
export class User {
  _id!: string;
  @Prop({ required: true, unique: true, index: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true })
  username!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: false })
  avatarUrl?: string;

  @Prop({ required: false })
  bannerUrl?: string;

  @Prop({ required: false })
  bio?: string;

  @Prop({ default: UserStatus.OFFLINE, enum: UserStatus })
  status!: UserStatus;

  @Prop({ default: null })
  lastSeen?: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  friends!: Types.ObjectId[];
}

export const userSchema = SchemaFactory.createForClass(User);
