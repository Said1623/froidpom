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
exports.ReservationsService = exports.UpdateReservationDto = exports.CreateReservationDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const reservation_entity_1 = require("./reservation.entity");
const class_validator_1 = require("class-validator");
class CreateReservationDto {
}
exports.CreateReservationDto = CreateReservationDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateReservationDto.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateReservationDto.prototype, "dateReservation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateReservationDto.prototype, "dateSortiePrevisionnelle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReservationDto.prototype, "nbCaissesBois", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReservationDto.prototype, "nbCaissesP\u043B\u0430\u0441\u0442ique", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReservationDto.prototype, "nbCaissesTranger", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReservationDto.prototype, "prixUnitaireBois", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReservationDto.prototype, "prixUnitairePlastique", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReservationDto.prototype, "prixUnitaireTranger", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReservationDto.prototype, "notes", void 0);
class UpdateReservationDto {
}
exports.UpdateReservationDto = UpdateReservationDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateReservationDto.prototype, "dateReservation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateReservationDto.prototype, "dateSortiePrevisionnelle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateReservationDto.prototype, "nbCaissesBois", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateReservationDto.prototype, "nbCaissesP\u043B\u0430\u0441\u0442ique", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateReservationDto.prototype, "nbCaissesTranger", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateReservationDto.prototype, "prixUnitaireBois", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateReservationDto.prototype, "prixUnitairePlastique", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateReservationDto.prototype, "prixUnitaireTranger", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateReservationDto.prototype, "statut", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateReservationDto.prototype, "notes", void 0);
let ReservationsService = class ReservationsService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(clientId) {
        const where = {};
        if (clientId)
            where.client = { id: clientId };
        return this.repo.find({ where, order: { dateReservation: 'DESC' }, relations: ['client'] });
    }
    async findOne(id) {
        const r = await this.repo.findOne({ where: { id }, relations: ['client'] });
        if (!r)
            throw new common_1.NotFoundException(`Réservation #${id} introuvable`);
        return r;
    }
    async create(dto) {
        const reservation = this.repo.create({
            client: { id: dto.clientId },
            dateReservation: dto.dateReservation,
            dateSortiePrevisionnelle: dto.dateSortiePrevisionnelle,
            nbCaissesBois: dto.nbCaissesBois || 0,
            nbCaissesPластique: dto.nbCaissesPластique || 0,
            nbCaissesTranger: dto.nbCaissesTranger || 0,
            prixUnitaireBois: dto.prixUnitaireBois || 0,
            prixUnitairePlastique: dto.prixUnitairePlastique || 0,
            prixUnitaireTranger: dto.prixUnitaireTranger || 0,
            notes: dto.notes,
        });
        return this.repo.save(reservation);
    }
    async update(id, dto) {
        const reservation = await this.findOne(id);
        Object.assign(reservation, dto);
        return this.repo.save(reservation);
    }
    async remove(id) {
        const r = await this.findOne(id);
        return this.repo.remove(r);
    }
    async getMontantParClient(clientId) {
        const reservations = await this.findAll(clientId);
        const total = reservations.reduce((s, r) => s + r.montantTotal, 0);
        return { reservations, total };
    }
};
exports.ReservationsService = ReservationsService;
exports.ReservationsService = ReservationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(reservation_entity_1.Reservation)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ReservationsService);
//# sourceMappingURL=reservations.service.js.map