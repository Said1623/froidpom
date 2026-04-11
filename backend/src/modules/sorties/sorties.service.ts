import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sortie } from './sortie.entity';
import { ChambresService } from '../chambres/chambres.service';


@Injectable()
export class SortiesService {
  constructor(
    @InjectRepository(Sortie) private readonly repo: Repository<Sortie>,
    private readonly chambresService: ChambresService,
  ) {}

  findAll(clientId?: number, chambreId?: number) {
    const where: any = {};
    if (clientId) where.client = { id: clientId };
    if (chambreId) where.chambre = { id: chambreId };
    return this.repo.find({ where, order: { dateSortie: 'DESC' }, relations: ['client', 'chambre'] });
  }

  async findOne(id: number) {
    const s = await this.repo.findOne({ where: { id }, relations: ['client', 'chambre'] });
    if (!s) throw new NotFoundException(`Sortie #${id} introuvable`);
    return s;
  }

  async create(dto: any) {
    const chambre = await this.chambresService.findOne(dto.chambreId);
    if (chambre.stockActuel < dto.nbCaisses) {
      throw new BadRequestException(
        `Stock insuffisant. Disponible: ${chambre.stockActuel} caisses, demandé: ${dto.nbCaisses}`
      );
    }
     
    // @ts-ignore
    const sortie = this.repo.create({
      client: { id: dto.clientId } as any,
      chambre: { id: dto.chambreId } as any,
      dateSortie: dto.dateSortie,
      nbCaisses: dto.nbCaisses,
      typeCaisse: dto.typeCaisse || 'bois',
      reference: dto.reference,
      notes: dto.notes,
    });

    const saved = await this.repo.save(sortie);
    await this.chambresService.updateStock(dto.chambreId, -dto.nbCaisses);
    // @ts-ignore
    return this.findOne(saved.id);
  }

  async remove(id: number) {
    const sortie = await this.findOne(id);
    await this.chambresService.updateStock(sortie.chambre.id, sortie.nbCaisses);
    return this.repo.remove(sortie);
  }
}