"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entree_entity_1 = require("../entrees/entree.entity");
const sortie_entity_1 = require("../sorties/sortie.entity");
const paiement_entity_1 = require("../paiements/paiement.entity");
const reservation_entity_1 = require("../reservations/reservation.entity");
const location_entity_1 = require("../locations/location.entity");
const chambres_service_1 = require("../chambres/chambres.service");
let DashboardService = class DashboardService {
    constructor(entreeRepo, sortieRepo, paiementRepo, reservationRepo, locationRepo, chambresService) {
        this.entreeRepo = entreeRepo;
        this.sortieRepo = sortieRepo;
        this.paiementRepo = paiementRepo;
        this.reservationRepo = reservationRepo;
        this.locationRepo = locationRepo;
        this.chambresService = chambresService;
    }
    async getResume() {
        const chambreStats = await this.chambresService.getStats();
        const paiements = await this.paiementRepo.find();
        const totalPaye = paiements.reduce((s, p) => s + Number(p.montant), 0);
        const reservations = await this.reservationRepo.find({ relations: ['client'] });
        const totalReservations = reservations.length;
        const montantReservations = reservations.reduce((s, r) => s + r.montantTotal, 0);
        const resteAPayer = montantReservations - totalPaye;
        const locations = await this.locationRepo.find();
        const totalCaissesLouees = locations.reduce((s, l) => s + l.nbCaisses, 0);
        const totalCaissesRestantes = locations.reduce((s, l) => s + l.nbCaissesRestantes, 0);
        const today = new Date().toISOString().split('T')[0];
        const entreesAujourd = await this.entreeRepo.count({ where: { dateEntree: today } });
        const sortiesAujourd = await this.sortieRepo.count({ where: { dateSortie: today } });
        const il_y_a_30j = new Date();
        il_y_a_30j.setDate(il_y_a_30j.getDate() - 30);
        const entrees30j = await this.entreeRepo.find({
            where: { dateEntree: (0, typeorm_2.MoreThanOrEqual)(il_y_a_30j.toISOString().split('T')[0]) },
            order: { dateEntree: 'ASC' },
        });
        const sorties30j = await this.sortieRepo.find({
            where: { dateSortie: (0, typeorm_2.MoreThanOrEqual)(il_y_a_30j.toISOString().split('T')[0]) },
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entree_entity_1.Entree)),
    __param(1, (0, typeorm_1.InjectRepository)(sortie_entity_1.Sortie)),
    __param(2, (0, typeorm_1.InjectRepository)(paiement_entity_1.Paiement)),
    __param(3, (0, typeorm_1.InjectRepository)(reservation_entity_1.Reservation)),
    __param(4, (0, typeorm_1.InjectRepository)(location_entity_1.Location)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        chambres_service_1.ChambresService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map