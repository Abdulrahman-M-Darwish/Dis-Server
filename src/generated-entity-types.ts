/**

 * This file is auto-generated from entity definitions.

 * Do not edit by hand.

 */

// src\channels\entities\channel.entity.ts

export type ChannelType = "voice" | "text";

export type Channel = {
  serverId: string;
  name: string;
  type: ChannelType;
};

// src\members\entities\member.entity.ts

export type Member = {
  serverId: string;
  userId: string;
  roleIds: string[];
};

// src\roles\entities\role.entity.ts

export type Role = {
  serverId: string;
  name: string;
  color?: string | undefined;
  permissions: string[];
};

// src\servers\entities\server.entity.ts

export type Server = {
  name: string;
  thumbnail?: string | undefined;
  banner?: string | undefined;
  isPublic: boolean;
  description?: string | undefined;
  membersCount: number;
  ownerId: string;
};

// src\users\entities\user.entity.ts

export type Gender = "male" | "female" | "prefer_not_to_say";

export type User = {
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  gender: Gender;
  birthDate: string;
  avatarUrl?: string | undefined;
  bannerUrl?: string | undefined;
  bio?: string | undefined;
};