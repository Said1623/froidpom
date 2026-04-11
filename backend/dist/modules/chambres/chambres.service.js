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
exports.ChambresService = exports.UpdateChambreDto = exports.CreateChambreDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chambre_entity_1 = require("./chambre.entity");
const class_validator_1 = require("class-validator");
class CreateChambreDto {
}
exports.CreateChambreDto = CreateChambreDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChambreDto.prototype, "nom", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateChambreDto.prototype, "capaciteMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChambreDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateChambreDto.prototype, "temperatureCible", void 0);
class UpdateChambreDto {
}
exports.UpdateChambreDto = UpdateChambreDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateChambreDto.prototype, "nom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateChambreDto.prototype, "capaciteMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateChambreDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateChambreDto.prototype, "temperatureCible", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateChambreDto.prototype, "active", void 0);
let ChambresService = class ChambresService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll() {
        return this.repo.find({ order: { nom: 'ASC' } });
    }
    async findOne(id) {
        const c = await this.repo.findOne({ where: { id } });
        if (!c)
            throw new common_1.NotFoundException(`Chambre #${id} introuvable`);
        return c;
    }
    create(dto) {
        const chambre = this.repo.create(dto);
        return this.repo.save(chambre);
    }
    async update(id, dto) {
        const chambre = await this.findOne(id);
        if (dto.capaciteMax && dto.capaciteMax < chambre.stockActuel) {
            throw new common_1.BadRequestException(`Capacité max (${dto.capaciteMax}) inférieure au stock actuel (${chambre.stockActuel})`);
        }
        Object.assign(chambre, dto);
        return this.repo.save(chambre);
    }
    async remove(id) {
        const chambre = await this.findOne(id);
        if (chambre.stockActuel > 0) {
            throw new common_1.BadRequestException('Impossible de supprimer une chambre avec du stock');
        }
        return this.repo.remove(chambre);
    }
    async updateStock(id, delta) {
        const chambre = await this.findOne(id);
        const nouveau = chambre.stockActuel + delta;
        if (nouveau < 0)
            throw new common_1.BadRequestException('Stock insuffisant dans la chambre');
        if (nouveau > chambre.capaciteMax)
            throw new common_1.BadRequestException(`Capacité dépassée (${chambre.capaciteMax} caisses max)`);
        chambre.stockActuel = nouveau;
        return this.repo.save(chambre);
    }
    async getStats() {
        const chambres = await this.findAll();
        const totalCapacite = chambres.reduce((s, c) => s + c.capaciteMax, 0);
        const totalStock = chambres.reduce((s, c) => s + c.stockActuel, 0);
        return {
            chambres,
            totalCapacite,
            totalStock,
            totalDisponible: totalCapacite - totalStock,
            tauxRemplissageGlobal: totalCapacite > 0 ? Math.round((totalStock / totalCapacite) * 100) : 0,
        };
    }
};
exports.ChambresService = ChambresService;
exports.ChambresService = ChambresService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chambre_entity_1.Chambre)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ChambresService);
//# sourceMappingURL=chambres.service.js.map