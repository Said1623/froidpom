import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, TypeCaisse } from './location.entity';
import { LocationRetour } from './location-retour.entity';
import { IsInt, IsOptional, IsString, IsDateString, IsNumber, IsEnum, Min } from 'class-validator';

export class CreateLocationDto {
  @IsInt() clientId: number;
  @IsDateString() dateLocation: string;
  @IsInt() @Min(1) nbCaisses: number;
  @IsOptional() @IsEnum(TypeCaisse) typeCaisse?: TypeCaisse;
  @IsOptional() @IsNumber() prixUnitaire?: number;
  @IsOptional() @IsString() dateRetourPrevu?: string;
  @IsOptional() @IsString() notes?: string;
}

export class RetourLocationDto {
  @IsInt() @Min(1) nbRetournees: number;
  @IsOptional() @IsString() dateRetour?: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location) private readonly repo: Repository<Location>,
    @InjectRepository(LocationRetour) private readonly retourRepo: Repository<LocationRetour>,
  ) {}

  findAll(clientId?: number) {
    const where: any = {};
    if (clientId) where.client = { id: clientId };
    return this.repo.find({ where, order: { dateLocation: 'DESC' }, relations: ['client'] });
  }

  // Récupérer tous les retours (historique)
  findAllRetours(clientId?: number) {
    const where: any = clientId ? { client: { id: clientId } } : {};
    return this.retourRepo.find({
      where,
      order: { dateRetour: 'DESC', createdAt: 'DESC' },
      relations: ['client', 'location'],
    });
  }

  async findOne(id: number) {
    const l = await this.repo.findOne({ where: { id }, relations: ['client'] });
    if (!l) throw new NotFoundException(`Location #${id} introuvable`);
    return l;
  }

  async create(dto: CreateLocationDto) {
    const location = this.repo.create({
      client: { id: dto.clientId } as any,
      dateLocation: dto.dateLocation,
      nbCaisses: dto.nbCaisses,
      typeCaisse: dto.typeCaisse || TypeCaisse.BOIS,
      prixUnitaire: dto.prixUnitaire || 0,
      dateRetourPrevu: dto.dateRetourPrevu,
      notes: dto.notes,
    });
    return this.repo.save(location);
  }

  async enregistrerRetour(id: number, dto: RetourLocationDto) {
    const location = await this.findOne(id);
    const restantes = location.nbCaisses - location.nbCaissesRetournees;
    if (dto.nbRetournees > restantes) {
      throw new BadRequestException(
        `Impossible de retourner ${dto.nbRetournees} caisses. Restantes: ${restantes}`
      );
    }

    // 1. Mettre à jour le compteur sur la location
    location.nbCaissesRetournees += dto.nbRetournees;
    if (dto.notes) location.notes = dto.notes;
    await this.repo.save(location);

    // 2. Enregistrer le retour dans l'historique
    const dateRetour = dto.dateRetour || new Date().toISOString().split('T')[0];
    const retour = this.retourRepo.create({
      location: { id } as any,
      client: { id: location.client.id } as any,
      dateRetour,
      nbRetournees: dto.nbRetournees,
      typeCaisse: location.typeCaisse,
      notes: dto.notes,
    });
    await this.retourRepo.save(retour);

    return location;
  }

  async remove(id: number) {
    const l = await this.findOne(id);
    return this.repo.remove(l);
  }

  async getSuiviClient(clientId: number) {
    const locations = await this.findAll(clientId);
    const totalLoue = locations.reduce((s, l) => s + l.nbCaisses, 0);
    const totalRetourne = locations.reduce((s, l) => s + l.nbCaissesRetournees, 0);
    return { locations, totalLoue, totalRetourne, totalRestant: totalLoue - totalRetourne };
  }
}