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
exports.EntreesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entree_entity_1 = require("./entree.entity");
const chambres_service_1 = require("../chambres/chambres.service");
let EntreesService = class EntreesService {
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
        return this.repo.find({ where, order: { dateEntree: 'DESC' }, relations: ['client', 'chambre'] });
    }
    async findOne(id) {
        const e = await this.repo.findOne({ where: { id }, relations: ['client', 'chambre'] });
        if (!e)
            throw new common_1.NotFoundException(`Entrée #${id} introuvable`);
        return e;
    }
    async create(dto) {
        const chambre = await this.chambresService.findOne(dto.chambreId);
        if (chambre.stockActuel + dto.nbCaisses > chambre.capaciteMax) {
            throw new common_1.BadRequestException(`Capacité dépassée. Disponible: ${chambre.disponible} caisses, demandé: ${dto.nbCaisses}`);
        }
        const entree = this.repo.create({
            client: { id: dto.clientId },
            chambre: { id: dto.chambreId },
            dateEntree: dto.dateEntree,
            nbCaisses: dto.nbCaisses,
            typeCaisse: dto.typeCaisse || 'bois',
            reference: dto.reference,
            notes: dto.notes,
        });
        const saved = await this.repo.save(entree);
        await this.chambresService.updateStock(dto.chambreId, dto.nbCaisses);
        return this.findOne(saved.id);
    }
    async remove(id) {
        const entree = await this.findOne(id);
        await this.chambresService.updateStock(entree.chambre.id, -entree.nbCaisses);
        return this.repo.remove(entree);
    }
};
exports.EntreesService = EntreesService;
exports.EntreesService = EntreesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entree_entity_1.Entree)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        chambres_service_1.ChambresService])
], EntreesService);
//# sourceMappingURL=entrees.service.js.map