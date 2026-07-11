import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Role } from './entities/role.entity';
import { DeleteResult, Model } from 'mongoose';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private readonly rolesModel: Model<Role>,
  ) {}

  create(createRoleDto: CreateRoleDto) {
    return this.rolesModel.create(createRoleDto);
  }

  findAll() {
    return this.rolesModel.find();
  }

  findOne(id: string) {
    return this.rolesModel.findById(id);
  }

  update(id: string, updateRoleDto: UpdateRoleDto) {
    return this.rolesModel.updateOne(
      { _id: id },
      { $set: { ...updateRoleDto } },
    );
  }

  remove(id: string): Promise<DeleteResult> {
    return this.rolesModel.deleteOne({ _id: id });
  }
}
