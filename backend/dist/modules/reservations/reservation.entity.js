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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reservation = exports.StatutReservation = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("../clients/client.entity");
var StatutReservation;
(function (StatutReservation) {
    StatutReservation["EN_ATTENTE"] = "en_attente";
    StatutReservation["CONFIRMEE"] = "confirmee";
    StatutReservation["ANNULEE"] = "annulee";
    StatutReservation["TERMINEE"] = "terminee";
})(StatutReservation || (exports.StatutReservation = StatutReservation = {}));
let Reservation = class Reservation {
    get totalCaisses() {
        return ((Number(this.nbCaissesBois) || 0) +
            (Number(this.nbCaissesPластique) || 0) +
            (Number(this.nbCaissesTranger) || 0));
    }
    get montantTotal() {
        return ((Number(this.nbCaissesBois) || 0) * (Number(this.prixUnitaireBois) || 0) +
            (Number(this.nbCaissesPластique) || 0) * (Number(this.prixUnitairePlastique) || 0) +
            (Number(this.nbCaissesTranger) || 0) * (Number(this.prixUnitaireTranger) || 0));
    }
};
exports.Reservation = Reservation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Reservation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, (c) => c.reservations, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], Reservation.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Reservation.prototype, "dateReservation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", String)
], Reservation.prototype, "dateSortiePrevisionnelle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Reservation.prototype, "nbCaissesBois", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Reservation.prototype, "nbCaissesP\u043B\u0430\u0441\u0442ique", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Reservation.prototype, "nbCaissesTranger", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Reservation.prototype, "prixUnitaireBois", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Reservation.prototype, "prixUnitairePlastique", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Reservation.prototype, "prixUnitaireTranger", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: StatutReservation,
        default: StatutReservation.EN_ATTENTE,
    }),
    __metadata("design:type", String)
], Reservation.prototype, "statut", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Reservation.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Reservation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Reservation.prototype, "updatedAt", void 0);
exports.Reservation = Reservation = __decorate([
    (0, typeorm_1.Entity)('reservations')
], Reservation);
//# sourceMappingURL=reservation.entity.js.map