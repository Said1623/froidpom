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
exports.Chambre = void 0;
const typeorm_1 = require("typeorm");
const entree_entity_1 = require("../entrees/entree.entity");
let Chambre = class Chambre {
    get tauxRemplissage() {
        if (!this.capaciteMax)
            return 0;
        return Math.round((this.stockActuel / this.capaciteMax) * 100);
    }
    get disponible() {
        return Math.max(0, this.capaciteMax - this.stockActuel);
    }
};
exports.Chambre = Chambre;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Chambre.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Chambre.prototype, "nom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Chambre.prototype, "capaciteMax", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Chambre.prototype, "stockActuel", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chambre.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Chambre.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], Chambre.prototype, "temperatureCible", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => entree_entity_1.Entree, (e) => e.chambre),
    __metadata("design:type", Array)
], Chambre.prototype, "entrees", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Chambre.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Chambre.prototype, "updatedAt", void 0);
exports.Chambre = Chambre = __decorate([
    (0, typeorm_1.Entity)('chambres')
], Chambre);
//# sourceMappingURL=chambre.entity.js.map