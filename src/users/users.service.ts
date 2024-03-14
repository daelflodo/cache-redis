import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { USER } from 'src/common/models/models';
import { IUser } from 'src/common/interfaces/user.interface';
import { sleep } from 'src/sleep';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USER.name) private readonly modelUser: Model<IUser>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  async create(createUserDto: CreateUserDto): Promise<IUser> {
    const hash = await this.hashPassword(createUserDto.password);
    const newUser = new this.modelUser({ ...createUserDto, password: hash });
    return await newUser.save();
  }

  async findAll(): Promise<any> {
    const key = 'users-find-all';
    const usersCache = await this.cacheManager.get(key);

    if (usersCache) {
      return usersCache;
    }

    const users = await this.modelUser.find();
    await sleep(3000);
    this.cacheManager.set(key, users, 1000 * 60 * 5);
    return users;
  }

  async findOne(id: string): Promise<any> {
    const key = `users-find-${id}`;
    const userCache = await this.cacheManager.get(key);

    if (userCache) {
      return userCache;
    }
    const user = await this.modelUser.findById(id);
    this.cacheManager.set(key, user, 1000 * 60 * 5);

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    const hash = await this.hashPassword(updateUserDto.password);
    const user = { ...updateUserDto, password: hash };
    return await this.modelUser.findByIdAndUpdate(id, user, { new: true });
  }

  async remove(id: string) {
    await this.modelUser.findByIdAndDelete(id);
    return { status: HttpStatus.OK, msg: 'User Deleted' };
  }
}
