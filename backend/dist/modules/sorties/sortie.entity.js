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
exports.Sortie = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("../clients/client.entity");
const chambre_entity_1 = require("../chambres/chambre.entity");
let Sortie = class Sortie {
};
exports.Sortie = Sortie;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Sortie.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, (c) => c.sorties, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], Sortie.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chambre_entity_1.Chambre, { eager: true, nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'chambre_id' }),
    __metadata("design:type", chambre_entity_1.Chambre)
], Sortie.prototype, "chambre", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Sortie.prototype, "dateSortie", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Sortie.prototype, "nbCaisses", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'bois' }),
    __metadata("design:type", String)
], Sortie.prototype, "typeCaisse", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Sortie.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Sortie.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Sortie.prototype, "createdAt", void 0);
exports.Sortie = Sortie = __decorate([
    (0, typeorm_1.Entity)('sorties')
], Sortie);
//# sourceMappingURL=sortie.entity.js.map