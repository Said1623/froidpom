import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entree } from './entree.entity';
import { ChambresService } from '../chambres/chambres.service';

@Injectable()
export class EntreesService {
  constructor(
    @InjectRepository(Entree) private readonly repo: Repository<Entree>,
    private readonly chambresService: ChambresService,
  ) {}

  findAll(clientId?: number, chambreId?: number) {
    const where: any = {};
    if (clientId) where.client = { id: clientId };
    if (chambreId) where.chambre = { id: chambreId };
    return this.repo.find({ where, order: { dateEntree: 'DESC' }, relations: ['client', 'chambre'] });
  }

  async findOne(id: number) {
    const e = await this.repo.findOne({ where: { id }, relations: ['client', 'chambre'] });
    if (!e) throw new NotFoundException(`Entrée #${id} introuvable`);
    return e;
  }

  async create(dto: any) {
    const chambre = await this.chambresService.findOne(dto.chambreId);
    if (chambre.stockActuel + dto.nbCaisses > chambre.capaciteMax) {
      throw new BadRequestException(
        `Capacité dépassée. Disponible: ${chambre.disponible} caisses, demandé: ${dto.nbCaisses}`
      );
    }
    // @ts-ignore
    const entree = this.repo.create({
      client: { id: dto.clientId } as any,
      chambre: { id: dto.chambreId } as any,
      dateEntree: dto.dateEntree,
      nbCaisses: dto.nbCaisses,
      typeCaisse: dto.typeCaisse || 'bois',
      reference: dto.reference,
      notes: dto.notes,
    });

    const saved = await this.repo.save(entree);
    await this.chambresService.updateStock(dto.chambreId, dto.nbCaisses);
    // @ts-ignore
    return this.findOne(saved.id);
  }

  async update(id: number, dto: any) {
    const entree = await this.findOne(id);
    const ancienNb = entree.nbCaisses;
    const nouveauNb = dto.nbCaisses;
    const diff = nouveauNb - ancienNb; // positif = on ajoute, négatif = on libère

    if (diff !== 0) {
      const chambre = await this.chambresService.findOne(entree.chambre.id);
      if (diff > 0 && chambre.stockActuel + diff > chambre.capaciteMax) {
        throw new BadRequestException(
          `Capacité dépassée. Disponible: ${chambre.disponible} caisses, différence: +${diff}`
        );
      }
    }

    entree.nbCaisses = nouveauNb;
    await this.repo.save(entree);

    // Mettre à jour le stock de la chambre avec la différence
    if (diff !== 0) {
      await this.chambresService.updateStock(entree.chambre.id, diff);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const entree = await this.findOne(id);
    await this.chambresService.updateStock(entree.chambre.id, -entree.nbCaisses);
    return this.repo.remove(entree);
  }
}