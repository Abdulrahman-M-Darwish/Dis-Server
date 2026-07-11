import { CreateServerDto } from 'src/servers/dto/create-server.dto';

export const servers: CreateServerDto[] = [
  { name: 'Server 1', ownerId: '', isPublic: true, membersCount: 1 },
  { name: 'Server 2', ownerId: '', isPublic: true, membersCount: 1 },
  { name: 'Server 3', ownerId: '', isPublic: false, membersCount: 1 },
  { name: 'Server 4', ownerId: '', isPublic: true, membersCount: 1 },
  { name: 'Server 5', ownerId: '', isPublic: true, membersCount: 1 },
];
