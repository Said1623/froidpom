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
exports.Client = void 0;
const typeorm_1 = require("typeorm");
const reservation_entity_1 = require("../reservations/reservation.entity");
const entree_entity_1 = require("../entrees/entree.entity");
const sortie_entity_1 = require("../sorties/sortie.entity");
const paiement_entity_1 = require("../paiements/paiement.entity");
const location_entity_1 = require("../locations/location.entity");
let Client = class Client {
};
exports.Client = Client;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Client.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Client.prototype, "nom", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "telephone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "adresse", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Client.prototype, "actif", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => reservation_entity_1.Reservation, (r) => r.client),
    __metadata("design:type", Array)
], Client.prototype, "reservations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => entree_entity_1.Entree, (e) => e.client),
    __metadata("design:type", Array)
], Client.prototype, "entrees", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => sortie_entity_1.Sortie, (s) => s.client),
    __metadata("design:type", Array)
], Client.prototype, "sorties", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => paiement_entity_1.Paiement, (p) => p.client),
    __metadata("design:type", Array)
], Client.prototype, "paiements", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => location_entity_1.Location, (l) => l.client),
    __metadata("design:type", Array)
], Client.prototype, "locations", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Client.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Client.prototype, "updatedAt", void 0);
exports.Client = Client = __decorate([
    (0, typeorm_1.Entity)('clients')
], Client);
//# sourceMappingURL=client.entity.js.map