import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true })
  serverId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  color?: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];
}

export type RoleDocument = HydratedDocument<Role>;
export const roleSchema = SchemaFactory.createForClass(Role);
