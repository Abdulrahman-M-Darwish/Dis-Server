import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Request,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import type { Request as RequestT } from 'express';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request/:receiverId')
  async sendRequest(
    @Request() req: RequestT & { user: { userId: string } },
    @Param('receiverId') receiverId: string,
  ) {
    return this.friendsService.sendFriendRequest(req.user.userId, receiverId);
  }

  @Patch('request/:requestId/accept')
  async acceptRequest(
    @Request() req: RequestT & { user: { userId: string } },
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.acceptFriendRequest(requestId, req.user.userId);
  }

  @Delete('request/:requestId')
  async cancelOrDeclineRequest(
    @Request() req: RequestT & { user: { userId: string } },
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.declineOrCancelRequest(
      requestId,
      req.user.userId,
    );
  }

  @Delete(':friendId')
  async unfriend(
    @Request() req: RequestT & { user: { userId: string } },
    @Param('friendId') friendId: string,
  ) {
    return this.friendsService.unfriend(req.user.userId, friendId);
  }

  @Get()
  async getFriends(@Request() req: RequestT & { user: { userId: string } }) {
    return this.friendsService.getFriends(req.user.userId);
  }

  @Get('requests')
  async getPendingRequests(
    @Request() req: RequestT & { user: { userId: string } },
  ) {
    return this.friendsService.getPendingRequests(req.user.userId);
  }
}
