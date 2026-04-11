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
exports.LocationsService = exports.RetourLocationDto = exports.CreateLocationDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const location_entity_1 = require("./location.entity");
const class_validator_1 = require("class-validator");
class CreateLocationDto {
}
exports.CreateLocationDto = CreateLocationDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLocationDto.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateLocationDto.prototype, "dateLocation", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateLocationDto.prototype, "nbCaisses", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(location_entity_1.TypeCaisse),
    __metadata("design:type", String)
], CreateLocationDto.prototype, "typeCaisse", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateLocationDto.prototype, "prixUnitaire", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLocationDto.prototype, "dateRetourPrevu", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLocationDto.prototype, "notes", void 0);
class RetourLocationDto {
}
exports.RetourLocationDto = RetourLocationDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RetourLocationDto.prototype, "nbRetournees", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RetourLocationDto.prototype, "notes", void 0);
let LocationsService = class LocationsService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(clientId) {
        const where = {};
        if (clientId)
            where.client = { id: clientId };
        return this.repo.find({ where, order: { dateLocation: 'DESC' }, relations: ['client'] });
    }
    async findOne(id) {
        const l = await this.repo.findOne({ where: { id }, relations: ['client'] });
        if (!l)
            throw new common_1.NotFoundException(`Location #${id} introuvable`);
        return l;
    }
    async create(dto) {
        const location = this.repo.create({
            client: { id: dto.clientId },
            dateLocation: dto.dateLocation,
            nbCaisses: dto.nbCaisses,
            typeCaisse: dto.typeCaisse || location_entity_1.TypeCaisse.BOIS,
            prixUnitaire: dto.prixUnitaire || 0,
            dateRetourPrevu: dto.dateRetourPrevu,
            notes: dto.notes,
        });
        return this.repo.save(location);
    }
    async enregistrerRetour(id, dto) {
        const location = await this.findOne(id);
        const restantes = location.nbCaisses - location.nbCaissesRetournees;
        if (dto.nbRetournees > restantes) {
            throw new common_1.BadRequestException(`Impossible de retourner ${dto.nbRetournees} caisses. Restantes: ${restantes}`);
        }
        location.nbCaissesRetournees += dto.nbRetournees;
        if (dto.notes)
            location.notes = dto.notes;
        return this.repo.save(location);
    }
    async remove(id) {
        const l = await this.findOne(id);
        return this.repo.remove(l);
    }
    async getSuiviClient(clientId) {
        const locations = await this.findAll(clientId);
        const totalLoue = locations.reduce((s, l) => s + l.nbCaisses, 0);
        const totalRetourne = locations.reduce((s, l) => s + l.nbCaissesRetournees, 0);
        return {
            locations,
            totalLoue,
            totalRetourne,
            totalRestant: totalLoue - totalRetourne,
        };
    }
    async getSuiviGlobal() {
        const locations = await this.repo.find({ relations: ['client'] });
        const totalLoue = locations.reduce((s, l) => s + l.nbCaisses, 0);
        const totalRetourne = locations.reduce((s, l) => s + l.nbCaissesRetournees, 0);
        return {
            totalLoue,
            totalRetourne,
            totalRestant: totalLoue - totalRetourne,
            enRetard: locations.filter((l) => l.dateRetourPrevu && new Date(l.dateRetourPrevu) < new Date() && l.nbCaissesRestantes > 0),
        };
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(location_entity_1.Location)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LocationsService);
//# sourceMappingURL=locations.service.js.map