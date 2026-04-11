import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chambre } from './chambre.entity';
import { IsString, IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateChambreDto {
  @IsString() nom: string;
  @IsInt() @Min(1) capaciteMax: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() temperatureCible?: number;
}

export class UpdateChambreDto {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsInt() @Min(1) capaciteMax?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() temperatureCible?: number;
  @IsOptional() active?: boolean;
}

@Injectable()
export class ChambresService {
  constructor(@InjectRepository(Chambre) private readonly repo: Repository<Chambre>) {}

  findAll() {
    return this.repo.find({ order: { nom: 'ASC' } });
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Chambre #${id} introuvable`);
    return c;
  }

  create(dto: CreateChambreDto) {
    const chambre = this.repo.create(dto);
    return this.repo.save(chambre);
  }

  async update(id: number, dto: UpdateChambreDto) {
    const chambre = await this.findOne(id);
    if (dto.capaciteMax && dto.capaciteMax < chambre.stockActuel) {
      throw new BadRequestException(
        `Capacité max (${dto.capaciteMax}) inférieure au stock actuel (${chambre.stockActuel})`
      );
    }
    Object.assign(chambre, dto);
    return this.repo.save(chambre);
  }

  async remove(id: number) {
    const chambre = await this.findOne(id);
    if (chambre.stockActuel > 0) {
      throw new BadRequestException('Impossible de supprimer une chambre avec du stock');
    }
    return this.repo.remove(chambre);
  }

  async updateStock(id: number, delta: number) {
    const chambre = await this.findOne(id);
    const nouveau = chambre.stockActuel + delta;
    if (nouveau < 0) throw new BadRequestException('Stock insuffisant dans la chambre');
    if (nouveau > chambre.capaciteMax)
      throw new BadRequestException(`Capacité dépassée (${chambre.capaciteMax} caisses max)`);
    chambre.stockActuel = nouveau;
    return this.repo.save(chambre);
  }

  async getStats() {
    const chambres = await this.findAll();
    const totalCapacite = chambres.reduce((s, c) => s + c.capaciteMax, 0);
    const totalStock = chambres.reduce((s, c) => s + c.stockActuel, 0);
    return {
      chambres,
      totalCapacite,
      totalStock,
      totalDisponible: totalCapacite - totalStock,
      tauxRemplissageGlobal: totalCapacite > 0 ? Math.round((totalStock / totalCapacite) * 100) : 0,
    };
  }
}
