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
exports.SortiesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sortie_entity_1 = require("./sortie.entity");
const chambres_service_1 = require("../chambres/chambres.service");
let SortiesService = class SortiesService {
    constructor(repo, chambresService) {
        this.repo = repo;
        this.chambresService = chambresService;
    }
    findAll(clientId, chambreId) {
        const where = {};
        if (clientId)
            where.client = { id: clientId };
        if (chambreId)
            where.chambre = { id: chambreId };
        return this.repo.find({ where, order: { dateSortie: 'DESC' }, relations: ['client', 'chambre'] });
    }
    async findOne(id) {
        const s = await this.repo.findOne({ where: { id }, relations: ['client', 'chambre'] });
        if (!s)
            throw new common_1.NotFoundException(`Sortie #${id} introuvable`);
        return s;
    }
    async create(dto) {
        const chambre = await this.chambresService.findOne(dto.chambreId);
        if (chambre.stockActuel < dto.nbCaisses) {
            throw new common_1.BadRequestException(`Stock insuffisant. Disponible: ${chambre.stockActuel} caisses, demandé: ${dto.nbCaisses}`);
        }
        const sortie = this.repo.create({
            client: { id: dto.clientId },
            chambre: { id: dto.chambreId },
            dateSortie: dto.dateSortie,
            nbCaisses: dto.nbCaisses,
            typeCaisse: dto.typeCaisse || 'bois',
            reference: dto.reference,
            notes: dto.notes,
        });
        const saved = await this.repo.save(sortie);
        await this.chambresService.updateStock(dto.chambreId, -dto.nbCaisses);
        return this.findOne(saved.id);
    }
    async remove(id) {
        const sortie = await this.findOne(id);
        await this.chambresService.updateStock(sortie.chambre.id, sortie.nbCaisses);
        return this.repo.remove(sortie);
    }
};
exports.SortiesService = SortiesService;
exports.SortiesService = SortiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sortie_entity_1.Sortie)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        chambres_service_1.ChambresService])
], SortiesService);
//# sourceMappingURL=sorties.service.js.map