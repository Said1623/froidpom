import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entree } from '../entrees/entree.entity';
import { Sortie } from '../sorties/sortie.entity';
import { ChambresService } from '../chambres/chambres.service';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Entree) private readonly entreeRepo: Repository<Entree>,
    @InjectRepository(Sortie) private readonly sortieRepo: Repository<Sortie>,
    private readonly chambresService: ChambresService,
  ) {}

  async getStockParChambre() {
    return this.chambresService.getStats();
  }

  async getStockParClient() {
    const entrees = await this.entreeRepo.find({ relations: ['client', 'chambre'] });
    const sorties = await this.sortieRepo.find({ relations: ['client', 'chambre'] });

    const map: Record<number, {
      clientId: number; clientNom: string;
      totalEntree: number; totalSortie: number; stockActuel: number;
      parChambre: Record<number, { chambreNom: string; entree: number; sortie: number; stock: number }>;
    }> = {};

    entrees.forEach((e) => {
      const cid = e.client.id;
      if (!map[cid]) map[cid] = { clientId: cid, clientNom: e.client.nom, totalEntree: 0, totalSortie: 0, stockActuel: 0, parChambre: {} };
      map[cid].totalEntree += e.nbCaisses;
      const chid = e.chambre.id;
      if (!map[cid].parChambre[chid]) map[cid].parChambre[chid] = { chambreNom: e.chambre.nom, entree: 0, sortie: 0, stock: 0 };
      map[cid].parChambre[chid].entree += e.nbCaisses;
    });

    sorties.forEach((s) => {
      const cid = s.client.id;
      if (!map[cid]) map[cid] = { clientId: cid, clientNom: s.client.nom, totalEntree: 0, totalSortie: 0, stockActuel: 0, parChambre: {} };
      map[cid].totalSortie += s.nbCaisses;
      if (s.chambre) {
        const chid = s.chambre.id;
        if (!map[cid].parChambre[chid]) map[cid].parChambre[chid] = { chambreNom: s.chambre.nom, entree: 0, sortie: 0, stock: 0 };
        map[cid].parChambre[chid].sortie += s.nbCaisses;
      }
    });

    Object.values(map).forEach((client) => {
      client.stockActuel = client.totalEntree - client.totalSortie;
      Object.values(client.parChambre).forEach((ch) => { ch.stock = ch.entree - ch.sortie; });
    });

    return Object.values(map).sort((a, b) => b.stockActuel - a.stockActuel);
  }

  async getMouvementsClient(clientId: number) {
    const entrees = await this.entreeRepo.find({
      where: { client: { id: clientId } },
      relations: ['chambre'],
      order: { dateEntree: 'DESC' },
    });
    const sorties = await this.sortieRepo.find({
      where: { client: { id: clientId } },
      relations: ['chambre'],
      order: { dateSortie: 'DESC' },
    });

    const mouvements = [
      ...entrees.map((e) => ({ type: 'entree', date: e.dateEntree, nbCaisses: e.nbCaisses, chambre: e.chambre?.nom, reference: e.reference })),
      ...sorties.map((s) => ({ type: 'sortie', date: s.dateSortie, nbCaisses: s.nbCaisses, chambre: s.chambre?.nom, reference: s.reference })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalEntree = entrees.reduce((s, e) => s + e.nbCaisses, 0);
    const totalSortie = sorties.reduce((s, e) => s + e.nbCaisses, 0);

    return { mouvements, totalEntree, totalSortie, stockActuel: totalEntree - totalSortie };
  }

  /** Stock détaillé par chambre ET par type pour un client — utilisé par la page Sortie */
  async getStockDetailClient(clientId: number) {
    const entrees = await this.entreeRepo.find({
      where: { client: { id: clientId } },
      relations: ['chambre'],
    });
    const sorties = await this.sortieRepo.find({
      where: { client: { id: clientId } },
      relations: ['chambre'],
    });

    // Structure : parChambre[chambreId] = { chambreNom, bois, plastique, tranger }
    const parChambre: Record<number, { chambreNom: string; bois: number; plastique: number; tranger: number }> = {};

    entrees.forEach((e) => {
      const chid = e.chambre?.id;
      if (!chid) return;
      if (!parChambre[chid]) parChambre[chid] = { chambreNom: e.chambre.nom, bois: 0, plastique: 0, tranger: 0 };
      const t = (e as any).typeCaisse || 'bois';
      if (t === 'bois') parChambre[chid].bois += e.nbCaisses;
      else if (t === 'plastique') parChambre[chid].plastique += e.nbCaisses;
      else if (t === 'tranger') parChambre[chid].tranger += e.nbCaisses;
    });

    sorties.forEach((s) => {
      const chid = s.chambre?.id;
      if (!chid) return;
      if (!parChambre[chid]) parChambre[chid] = { chambreNom: s.chambre.nom, bois: 0, plastique: 0, tranger: 0 };
      const t = (s as any).typeCaisse || 'bois';
      if (t === 'bois') parChambre[chid].bois -= s.nbCaisses;
      else if (t === 'plastique') parChambre[chid].plastique -= s.nbCaisses;
      else if (t === 'tranger') parChambre[chid].tranger -= s.nbCaisses;
    });

    // Nettoyer les négatifs et les chambres vides
    Object.keys(parChambre).forEach(key => {
      const ch = parChambre[parseInt(key)];
      ch.bois = Math.max(0, ch.bois);
      ch.plastique = Math.max(0, ch.plastique);
      ch.tranger = Math.max(0, ch.tranger);
      if (ch.bois === 0 && ch.plastique === 0 && ch.tranger === 0) {
        delete parChambre[parseInt(key)];
      }
    });

    const totalBois = Object.values(parChambre).reduce((s, c) => s + c.bois, 0);
    const totalPlastique = Object.values(parChambre).reduce((s, c) => s + c.plastique, 0);
    const totalTranger = Object.values(parChambre).reduce((s, c) => s + c.tranger, 0);

    return {
      clientId,
      parChambre,
      totalBois,
      totalPlastique,
      totalTranger,
      stockActuel: totalBois + totalPlastique + totalTranger,
    };
  }
}