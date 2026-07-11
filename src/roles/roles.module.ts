import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, roleSchema } from './entities/role.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: roleSchema }]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
