import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Entree } from '../entrees/entree.entity';
import { Sortie } from '../sorties/sortie.entity';
import { Paiement } from '../paiements/paiement.entity';
import { Reservation } from '../reservations/reservation.entity';
import { Location } from '../locations/location.entity';
import { ChambresService } from '../chambres/chambres.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Entree) private readonly entreeRepo: Repository<Entree>,
    @InjectRepository(Sortie) private readonly sortieRepo: Repository<Sortie>,
    @InjectRepository(Paiement) private readonly paiementRepo: Repository<Paiement>,
    @InjectRepository(Reservation) private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(Location) private readonly locationRepo: Repository<Location>,
    private readonly chambresService: ChambresService,
  ) {}

  async getResume() {
    const chambreStats = await this.chambresService.getStats();

    // Paiements
    const paiements = await this.paiementRepo.find();
    const totalPaye = paiements.reduce((s, p) => s + Number(p.montant), 0);

    // Réservations
    const reservations = await this.reservationRepo.find({ relations: ['client'] });
    const totalReservations = reservations.length;
    const montantReservations = reservations.reduce((s, r) => s + r.montantTotal, 0);
    const resteAPayer = montantReservations - totalPaye;

    // Locations
    const locations = await this.locationRepo.find();
    const totalCaissesLouees = locations.reduce((s, l) => s + l.nbCaisses, 0);
    const totalCaissesRestantes = locations.reduce((s, l) => s + l.nbCaissesRestantes, 0);

    // Mouvements du jour
    const today = new Date().toISOString().split('T')[0];
    const entreesAujourd = await this.entreeRepo.count({ where: { dateEntree: today } });
    const sortiesAujourd = await this.sortieRepo.count({ where: { dateSortie: today } });

    // Activité des 30 derniers jours
    const il_y_a_30j = new Date();
    il_y_a_30j.setDate(il_y_a_30j.getDate() - 30);
    const entrees30j = await this.entreeRepo.find({
      where: { dateEntree: MoreThanOrEqual(il_y_a_30j.toISOString().split('T')[0]) as any },
      order: { dateEntree: 'ASC' },
    });
    const sorties30j = await this.sortieRepo.find({
      where: { dateSortie: MoreThanOrEqual(il_y_a_30j.toISOString().split('T')[0]) as any },
      order: { dateSortie: 'ASC' },
    });

    return {
      chambres: {
        ...chambreStats,
        details: chambreStats.chambres.map((c) => ({
          id: c.id,
          nom: c.nom,
          capaciteMax: c.capaciteMax,
          stockActuel: c.stockActuel,
          disponible: c.disponible,
          tauxRemplissage: c.tauxRemplissage,
          temperatureCible: c.temperatureCible,
        })),
      },
      financier: {
        totalPaye,
        montantReservations,
        resteAPayer: Math.max(0, resteAPayer),
        totalReservations,
      },
      locations: {
        totalCaissesLouees,
        totalCaissesRestantes,
        tauxRetour: totalCaissesLouees > 0
          ? Math.round(((totalCaissesLouees - totalCaissesRestantes) / totalCaissesLouees) * 100)
          : 0,
      },
      mouvementsAujourdhui: {
        entrees: entreesAujourd,
        sorties: sortiesAujourd,
      },
      activite30j: {
        entrees: entrees30j.map((e) => ({ date: e.dateEntree, nb: e.nbCaisses })),
        sorties: sorties30j.map((s) => ({ date: s.dateSortie, nb: s.nbCaisses })),
      },
    };
  }
}
