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
exports.Paiement = exports.ModePaiement = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("../clients/client.entity");
var ModePaiement;
(function (ModePaiement) {
    ModePaiement["ESPECES"] = "especes";
    ModePaiement["VIREMENT"] = "virement";
    ModePaiement["CHEQUE"] = "cheque";
    ModePaiement["CARTE"] = "carte";
})(ModePaiement || (exports.ModePaiement = ModePaiement = {}));
let Paiement = class Paiement {
};
exports.Paiement = Paiement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Paiement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, (c) => c.paiements, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], Paiement.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Paiement.prototype, "datePaiement", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Paiement.prototype, "montant", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ModePaiement,
        default: ModePaiement.ESPECES,
    }),
    __metadata("design:type", String)
], Paiement.prototype, "modePaiement", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Paiement.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Paiement.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Paiement.prototype, "createdAt", void 0);
exports.Paiement = Paiement = __decorate([
    (0, typeorm_1.Entity)('paiements')
], Paiement);
//# sourceMappingURL=paiement.entity.js.map