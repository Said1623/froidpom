import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paiement, ModePaiement } from './paiement.entity';
import { IsInt, IsOptional, IsString, IsDateString, IsNumber, IsEnum, Min } from 'class-validator';

export class CreatePaiementDto {
  @IsInt() clientId: number;
  @IsDateString() datePaiement: string;
  @IsNumber() @Min(0.01) montant: number;
  @IsOptional() @IsEnum(ModePaiement) modePaiement?: ModePaiement;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class PaiementsService {
  constructor(@InjectRepository(Paiement) private readonly repo: Repository<Paiement>) {}

  findAll(clientId?: number) {
    const where: any = {};
    if (clientId) where.client = { id: clientId };
    return this.repo.find({ where, order: { datePaiement: 'DESC' }, relations: ['client'] });
  }

  async findOne(id: number) {
    const p = await this.repo.findOne({ where: { id }, relations: ['client'] });
    if (!p) throw new NotFoundException(`Paiement #${id} introuvable`);
    return p;
  }

  async create(dto: CreatePaiementDto) {
    const paiement = this.repo.create({
      client: { id: dto.clientId } as any,
      datePaiement: dto.datePaiement,
      montant: dto.montant,
      modePaiement: dto.modePaiement || ModePaiement.ESPECES,
      reference: dto.reference,
      notes: dto.notes,
    });
    return this.repo.save(paiement);
  }

  async remove(id: number) {
    const p = await this.findOne(id);
    return this.repo.remove(p);
  }

  async getBalanceClient(clientId: number) {
    const paiements = await this.findAll(clientId);
    const totalPaye = paiements.reduce((s, p) => s + Number(p.montant), 0);
    return { paiements, totalPaye };
  }

  async getBalanceGlobale() {
    const paiements = await this.repo.find({ relations: ['client'] });
    const totalPaye = paiements.reduce((s, p) => s + Number(p.montant), 0);

    // Regrouper par client
    const parClient: Record<number, { clientNom: string; total: number }> = {};
    paiements.forEach((p) => {
      if (!parClient[p.client.id]) {
        parClient[p.client.id] = { clientNom: p.client.nom, total: 0 };
      }
      parClient[p.client.id].total += Number(p.montant);
    });

    return { totalPaye, parClient };
  }
}
