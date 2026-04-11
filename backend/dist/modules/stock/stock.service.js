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
exports.StockService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entree_entity_1 = require("../entrees/entree.entity");
const sortie_entity_1 = require("../sorties/sortie.entity");
const chambres_service_1 = require("../chambres/chambres.service");
let StockService = class StockService {
    constructor(entreeRepo, sortieRepo, chambresService) {
        this.entreeRepo = entreeRepo;
        this.sortieRepo = sortieRepo;
        this.chambresService = chambresService;
    }
    async getStockParChambre() {
        return this.chambresService.getStats();
    }
    async getStockParClient() {
        const entrees = await this.entreeRepo.find({ relations: ['client', 'chambre'] });
        const sorties = await this.sortieRepo.find({ relations: ['client', 'chambre'] });
        const map = {};
        entrees.forEach((e) => {
            const cid = e.client.id;
            if (!map[cid])
                map[cid] = { clientId: cid, clientNom: e.client.nom, totalEntree: 0, totalSortie: 0, stockActuel: 0, parChambre: {} };
            map[cid].totalEntree += e.nbCaisses;
            const chid = e.chambre.id;
            if (!map[cid].parChambre[chid])
                map[cid].parChambre[chid] = { chambreNom: e.chambre.nom, entree: 0, sortie: 0, stock: 0 };
            map[cid].parChambre[chid].entree += e.nbCaisses;
        });
        sorties.forEach((s) => {
            const cid = s.client.id;
            if (!map[cid])
                map[cid] = { clientId: cid, clientNom: s.client.nom, totalEntree: 0, totalSortie: 0, stockActuel: 0, parChambre: {} };
            map[cid].totalSortie += s.nbCaisses;
            if (s.chambre) {
                const chid = s.chambre.id;
                if (!map[cid].parChambre[chid])
                    map[cid].parChambre[chid] = { chambreNom: s.chambre.nom, entree: 0, sortie: 0, stock: 0 };
                map[cid].parChambre[chid].sortie += s.nbCaisses;
            }
        });
        Object.values(map).forEach((client) => {
            client.stockActuel = client.totalEntree - client.totalSortie;
            Object.values(client.parChambre).forEach((ch) => {
                ch.stock = ch.entree - ch.sortie;
            });
        });
        return Object.values(map).sort((a, b) => b.stockActuel - a.stockActuel);
    }
    async getMouvementsClient(clientId) {
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
};
exports.StockService = StockService;
exports.StockService = StockService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entree_entity_1.Entree)),
    __param(1, (0, typeorm_1.InjectRepository)(sortie_entity_1.Sortie)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        chambres_service_1.ChambresService])
], StockService);
//# sourceMappingURL=stock.service.js.map