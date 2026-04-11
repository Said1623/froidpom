import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Client } from './client.entity';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateClientDto {
  @IsString() nom: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class UpdateClientDto {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() actif?: boolean;
}

@Injectable()
export class ClientsService {
  constructor(@InjectRepository(Client) private readonly repo: Repository<Client>) {}

  findAll(search?: string) {
    if (search) {
      return this.repo.find({
        where: [{ nom: ILike(`%${search}%`) }, { telephone: ILike(`%${search}%`) }],
        order: { nom: 'ASC' },
      });
    }
    return this.repo.find({ order: { nom: 'ASC' } });
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({
      where: { id },
      relations: ['reservations', 'entrees', 'sorties', 'paiements', 'locations'],
    });
    if (!c) throw new NotFoundException(`Client #${id} introuvable`);
    return c;
  }

  create(dto: CreateClientDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateClientDto) {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    return this.repo.save(client);
  }

  async remove(id: number) {
    const client = await this.findOne(id);
    client.actif = false;
    return this.repo.save(client);
  }

  async getStockClient(clientId: number) {
    // Stock actuel par chambre pour ce client
    const client = await this.repo.findOne({
      where: { id: clientId },
      relations: ['entrees', 'entrees.chambre', 'sorties'],
    });
    if (!client) throw new NotFoundException(`Client #${clientId} introuvable`);
    return client;
  }
}
