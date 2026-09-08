import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteResult } from 'mongoose';
import { SearchUsersDto } from './dto/search-users.dto';
import type { Request as RequestT } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(
    @Request() req: RequestT & { user: { userId: string } },
    @Query() searchUsersDto: SearchUsersDto,
  ) {
    return this.usersService.findAll(req.user.userId, searchUsersDto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: RequestT & { user: { userId: string } },
  ) {
    return this.usersService.findOne(
      id === 'me' ? req.user.userId : id,
      req.user.userId,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<DeleteResult> {
    return this.usersService.remove(id);
  }
}
