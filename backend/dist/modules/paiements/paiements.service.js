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
exports.PaiementsService = exports.CreatePaiementDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const paiement_entity_1 = require("./paiement.entity");
const class_validator_1 = require("class-validator");
class CreatePaiementDto {
}
exports.CreatePaiementDto = CreatePaiementDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreatePaiementDto.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePaiementDto.prototype, "datePaiement", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreatePaiementDto.prototype, "montant", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(paiement_entity_1.ModePaiement),
    __metadata("design:type", String)
], CreatePaiementDto.prototype, "modePaiement", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaiementDto.prototype, "reference", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaiementDto.prototype, "notes", void 0);
let PaiementsService = class PaiementsService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(clientId) {
        const where = {};
        if (clientId)
            where.client = { id: clientId };
        return this.repo.find({ where, order: { datePaiement: 'DESC' }, relations: ['client'] });
    }
    async findOne(id) {
        const p = await this.repo.findOne({ where: { id }, relations: ['client'] });
        if (!p)
            throw new common_1.NotFoundException(`Paiement #${id} introuvable`);
        return p;
    }
    async create(dto) {
        const paiement = this.repo.create({
            client: { id: dto.clientId },
            datePaiement: dto.datePaiement,
            montant: dto.montant,
            modePaiement: dto.modePaiement || paiement_entity_1.ModePaiement.ESPECES,
            reference: dto.reference,
            notes: dto.notes,
        });
        return this.repo.save(paiement);
    }
    async remove(id) {
        const p = await this.findOne(id);
        return this.repo.remove(p);
    }
    async getBalanceClient(clientId) {
        const paiements = await this.findAll(clientId);
        const totalPaye = paiements.reduce((s, p) => s + Number(p.montant), 0);
        return { paiements, totalPaye };
    }
    async getBalanceGlobale() {
        const paiements = await this.repo.find({ relations: ['client'] });
        const totalPaye = paiements.reduce((s, p) => s + Number(p.montant), 0);
        const parClient = {};
        paiements.forEach((p) => {
            if (!parClient[p.client.id]) {
                parClient[p.client.id] = { clientNom: p.client.nom, total: 0 };
            }
            parClient[p.client.id].total += Number(p.montant);
        });
        return { totalPaye, parClient };
    }
};
exports.PaiementsService = PaiementsService;
exports.PaiementsService = PaiementsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(paiement_entity_1.Paiement)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PaiementsService);
//# sourceMappingURL=paiements.service.js.map