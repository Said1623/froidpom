import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, StatutReservation } from './reservation.entity';
import { IsInt, IsOptional, IsString, IsDateString, IsNumber, Min } from 'class-validator';

export class CreateReservationDto {
  @IsInt() clientId: number;
  @IsDateString() dateReservation: string;
  @IsOptional() @IsDateString() dateSortiePrevisionnelle?: string;
  @IsOptional() @IsInt() @Min(0) nbCaissesBois?: number;
  @IsOptional() @IsInt() @Min(0) nbCaissesPластique?: number;
  @IsOptional() @IsInt() @Min(0) nbCaissesTranger?: number;
  @IsOptional() @IsNumber() prixUnitaireBois?: number;
  @IsOptional() @IsNumber() prixUnitairePlastique?: number;
  @IsOptional() @IsNumber() prixUnitaireTranger?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateReservationDto {
  @IsOptional() @IsDateString() dateReservation?: string;
  @IsOptional() @IsDateString() dateSortiePrevisionnelle?: string;
  @IsOptional() @IsInt() @Min(0) nbCaissesBois?: number;
  @IsOptional() @IsInt() @Min(0) nbCaissesPластique?: number;
  @IsOptional() @IsInt() @Min(0) nbCaissesTranger?: number;
  @IsOptional() @IsNumber() prixUnitaireBois?: number;
  @IsOptional() @IsNumber() prixUnitairePlastique?: number;
  @IsOptional() @IsNumber() prixUnitaireTranger?: number;
  @IsOptional() statut?: StatutReservation;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class ReservationsService {
  constructor(@InjectRepository(Reservation) private readonly repo: Repository<Reservation>) {}

  findAll(clientId?: number) {
    const where: any = {};
    if (clientId) where.client = { id: clientId };
    return this.repo.find({ where, order: { dateReservation: 'DESC' }, relations: ['client'] });
  }

  async findOne(id: number) {
    const r = await this.repo.findOne({ where: { id }, relations: ['client'] });
    if (!r) throw new NotFoundException(`Réservation #${id} introuvable`);
    return r;
  }

  async create(dto: CreateReservationDto) {
    const reservation = this.repo.create({
      client: { id: dto.clientId } as any,
      dateReservation: dto.dateReservation,
      dateSortiePrevisionnelle: dto.dateSortiePrevisionnelle,
      nbCaissesBois: dto.nbCaissesBois || 0,
      nbCaissesPластique: dto.nbCaissesPластique || 0,
      nbCaissesTranger: dto.nbCaissesTranger || 0,
      prixUnitaireBois: dto.prixUnitaireBois || 0,
      prixUnitairePlastique: dto.prixUnitairePlastique || 0,
      prixUnitaireTranger: dto.prixUnitaireTranger || 0,
      notes: dto.notes,
    });
    return this.repo.save(reservation);
  }

  async update(id: number, dto: UpdateReservationDto) {
    const reservation = await this.findOne(id);
    Object.assign(reservation, dto);
    return this.repo.save(reservation);
  }

  async remove(id: number) {
    const r = await this.findOne(id);
    return this.repo.remove(r);
  }

  async getMontantParClient(clientId: number) {
    const reservations = await this.findAll(clientId);
    const total = reservations.reduce((s, r) => s + r.montantTotal, 0);
    return { reservations, total };
  }
}
