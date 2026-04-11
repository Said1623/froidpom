"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaiementsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const paiement_entity_1 = require("./paiement.entity");
const paiements_service_1 = require("./paiements.service");
const paiements_controller_1 = require("./paiements.controller");
let PaiementsModule = class PaiementsModule {
};
exports.PaiementsModule = PaiementsModule;
exports.PaiementsModule = PaiementsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([paiement_entity_1.Paiement])],
        controllers: [paiements_controller_1.PaiementsController],
        providers: [paiements_service_1.PaiementsService],
        exports: [paiements_service_1.PaiementsService],
    })
], PaiementsModule);
//# sourceMappingURL=paiements.module.js.map