import mongoose from 'mongoose';
import { users } from './users';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/entities/user.entity';

const seed = async () => {
  console.log('Seeding database...');

  // Bootstrap a Nest application context so we can use Providers (UsersService)
  const app = await NestFactory.createApplicationContext(AppModule);

  // Ensure mongoose connection is ready via MongooseModule in AppModule
  const db = await mongoose.connect(process.env.MONGODB_URI!);

  const userCollection = db.connection.collection('users');

  console.log('Clearing Users collection');
  await userCollection.deleteMany({});

  console.log('Seeding Users via UsersService');
  const usersService = app.get(UsersService);
  const createdUsers: UserDocument[] = [];
  for (const u of users) {
    const user = await usersService.create(u);
    createdUsers.push(user);
  }

  console.log('Database seeded successfully.');
  await app.close();
  await db.disconnect();
};

void seed();
