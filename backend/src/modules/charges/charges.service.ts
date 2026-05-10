import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charge } from './charge.entity';
import { PaiementCharge } from './paiement-charge.entity';

@Injectable()
export class ChargesService {
  constructor(
    @InjectRepository(Charge) private readonly chargeRepo: Repository<Charge>,
    @InjectRepository(PaiementCharge) private readonly paiementRepo: Repository<PaiementCharge>,
  ) {}

  // ── Charges ────────────────────────────────────────────
  async findAll(campagne?: string) {
    const charges = await this.chargeRepo.find({
      where: campagne ? { campagne } : {},
      relations: ['paiements'],
      order: { createdAt: 'DESC' },
    });
    return charges.map(c => this.enrichCharge(c));
  }

  async findOne(id: number) {
    const c = await this.chargeRepo.findOne({ where: { id }, relations: ['paiements'] });
    if (!c) throw new NotFoundException(`Charge #${id} introuvable`);
    return this.enrichCharge(c);
  }

  async create(dto: any) {
    const charge = this.chargeRepo.create({
      libelle: dto.libelle,
      categorie: dto.categorie,
      icone: dto.icone || '💰',
      montantTotal: dto.montantTotal,
      periodicite: dto.periodicite || 'unique',
      campagne: dto.campagne,
      dateEcheance: dto.dateEcheance,
      notes: dto.notes,
    });
    const saved = await this.chargeRepo.save(charge);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: any) {
    const charge = await this.chargeRepo.findOne({ where: { id } });
    if (!charge) throw new NotFoundException();
    Object.assign(charge, {
      libelle: dto.libelle ?? charge.libelle,
      categorie: dto.categorie ?? charge.categorie,
      icone: dto.icone ?? charge.icone,
      montantTotal: dto.montantTotal ?? charge.montantTotal,
      periodicite: dto.periodicite ?? charge.periodicite,
      campagne: dto.campagne ?? charge.campagne,
      dateEcheance: dto.dateEcheance ?? charge.dateEcheance,
      notes: dto.notes ?? charge.notes,
    });
    await this.chargeRepo.save(charge);
    return this.findOne(id);
  }

  async remove(id: number) {
    const charge = await this.chargeRepo.findOne({ where: { id } });
    if (!charge) throw new NotFoundException();
    return this.chargeRepo.remove(charge);
  }

  // ── Paiements de charges ───────────────────────────────
  async addPaiement(chargeId: number, dto: any) {
    const charge = await this.chargeRepo.findOne({ where: { id: chargeId } });
    if (!charge) throw new NotFoundException();
    const p = this.paiementRepo.create({
      charge: { id: chargeId } as any,
      montantPaye: dto.montantPaye,
      datePaiement: dto.datePaiement || new Date().toISOString().split('T')[0],
      notes: dto.notes,
    });
    await this.paiementRepo.save(p);
    return this.findOne(chargeId);
  }

  async removePaiement(paiementId: number) {
    const p = await this.paiementRepo.findOne({ where: { id: paiementId } });
    if (!p) throw new NotFoundException();
    return this.paiementRepo.remove(p);
  }

  // ── Résumé comptable (revenus + charges) ──────────────
  async getResume(campagne?: string) {
    const charges = await this.findAll(campagne);
    const totalDu = charges.reduce((s, c) => s + Number(c.montantTotal), 0);
    const totalPaye = charges.reduce((s, c) => s + c.totalPaye, 0);
    const resteAPayer = charges.reduce((s, c) => s + c.resteAPayer, 0);
    const soldees = charges.filter(c => c.statut === 'solde').length;
    const partielles = charges.filter(c => c.statut === 'partiel').length;
    const impayes = charges.filter(c => c.statut === 'impaye').length;

    // Résumé par catégorie
    const parCategorie: Record<string, { totalDu: number; totalPaye: number; reste: number }> = {};
    charges.forEach(c => {
      if (!parCategorie[c.categorie]) parCategorie[c.categorie] = { totalDu: 0, totalPaye: 0, reste: 0 };
      parCategorie[c.categorie].totalDu += Number(c.montantTotal);
      parCategorie[c.categorie].totalPaye += c.totalPaye;
      parCategorie[c.categorie].reste += c.resteAPayer;
    });

    return { charges, totalDu, totalPaye, resteAPayer, soldees, partielles, impayes, parCategorie };
  }

  // ── Enrichissement d'une charge ───────────────────────
  private enrichCharge(c: Charge) {
    const totalPaye = (c.paiements || []).reduce((s, p) => s + Number(p.montantPaye), 0);
    const montantTotal = Number(c.montantTotal);
    const resteAPayer = Math.max(0, montantTotal - totalPaye);
    const pct = montantTotal > 0 ? Math.round((totalPaye / montantTotal) * 100) : 0;
    const statut = resteAPayer === 0 ? 'solde' : totalPaye > 0 ? 'partiel' : 'impaye';
    return { ...c, totalPaye, resteAPayer, pct, statut };
  }
}