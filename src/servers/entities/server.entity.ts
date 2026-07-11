import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Server {
  @Prop({ required: true })
  name: string;

  @Prop()
  thumbnail?: string;

  @Prop()
  banner?: string;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop()
  description?: string;

  @Prop({ default: 1 })
  membersCount: number;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  ownerId: mongoose.Types.ObjectId;
}

export type ServerDocument = HydratedDocument<Server>;

export const serverSchema = SchemaFactory.createForClass(Server);
