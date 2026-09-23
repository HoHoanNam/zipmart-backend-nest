import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './address.entity.js';
import type { CreateAddressDto } from './dto/create-address.dto.js';
import type { UpdateAddressDto } from './dto/update-address.dto.js';

@Injectable()
export class AddressesService {
  constructor(@InjectRepository(Address) private readonly addressRepo: Repository<Address>) {}

  findForUser(userId: string): Promise<Address[]> {
    return this.addressRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    if (dto.isDefault) {
      await this.unsetExistingDefault(userId);
    }
    const address = this.addressRepo.create({ ...dto, userId, isDefault: dto.isDefault ?? false });
    return this.addressRepo.save(address);
  }

  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<Address> {
    const address = await this.findOwnedOrThrow(userId, id);
    if (dto.isDefault) {
      await this.unsetExistingDefault(userId);
    }
    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async remove(userId: string, id: string): Promise<void> {
    const address = await this.findOwnedOrThrow(userId, id);
    await this.addressRepo.remove(address);
  }

  async setDefault(userId: string, id: string): Promise<Address> {
    const address = await this.findOwnedOrThrow(userId, id);
    await this.unsetExistingDefault(userId);
    address.isDefault = true;
    return this.addressRepo.save(address);
  }

  private async unsetExistingDefault(userId: string): Promise<void> {
    await this.addressRepo.update({ userId, isDefault: true }, { isDefault: false });
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<Address> {
    const address = await this.addressRepo.findOne({ where: { id, userId } });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }
}
