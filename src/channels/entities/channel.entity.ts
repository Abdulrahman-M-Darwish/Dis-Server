import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum ChannelType {
  VOICE = 'voice',
  TEXT = 'text',
}

@Schema({ timestamps: true })
export class Channel {
  @Prop({ required: true })
  serverId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: ChannelType;
}

export type ChannelDocument = HydratedDocument<Channel>;
export const channelSchema = SchemaFactory.createForClass(Channel);
