import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vente } from './vente.entity';

@Injectable()
export class VentesService {
  constructor(@InjectRepository(Vente) private repo: Repository<Vente>) {}

  findAll() { return this.repo.find({ order: { dateVente: 'DESC', createdAt: 'DESC' } }); }

  findOne(id: number) { return this.repo.findOne({ where: { id } }); }

  async create(dto: any) {
    const v = this.repo.create({
      client: { id: dto.clientId },
      dateVente: dto.dateVente,
      quantiteTonnes: dto.quantiteTonnes,
      villeDestinataire: dto.villeDestinataire,
      typeMarchandise: dto.typeMarchandise,
      prixUnitaire: dto.prixUnitaire,
      transporteur: dto.transporteur,
      statut: dto.statut || 'en_cours',
      notes: dto.notes,
    });
    return this.repo.save(v);
  }

  async update(id: number, dto: any) {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException();
    if (dto.clientId) v.client = { id: dto.clientId } as any;
    if (dto.dateVente !== undefined) v.dateVente = dto.dateVente;
    if (dto.quantiteTonnes !== undefined) v.quantiteTonnes = dto.quantiteTonnes;
    if (dto.villeDestinataire !== undefined) v.villeDestinataire = dto.villeDestinataire;
    if (dto.typeMarchandise !== undefined) v.typeMarchandise = dto.typeMarchandise;
    if (dto.prixUnitaire !== undefined) v.prixUnitaire = dto.prixUnitaire;
    if (dto.transporteur !== undefined) v.transporteur = dto.transporteur;
    if (dto.statut !== undefined) v.statut = dto.statut;
    if (dto.notes !== undefined) v.notes = dto.notes;
    return this.repo.save(v);
  }

  async remove(id: number) {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException();
    return this.repo.remove(v);
  }
}