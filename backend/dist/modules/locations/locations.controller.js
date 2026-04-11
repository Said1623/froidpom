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
exports.LocationsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const locations_service_1 = require("./locations.service");
let LocationsController = class LocationsController {
    constructor(service) {
        this.service = service;
    }
    findAll(clientId) {
        return this.service.findAll(clientId ? parseInt(clientId) : undefined);
    }
    getSuiviGlobal() { return this.service.getSuiviGlobal(); }
    getSuiviClient(clientId) {
        return this.service.getSuiviClient(clientId);
    }
    findOne(id) { return this.service.findOne(id); }
    create(dto) { return this.service.create(dto); }
    enregistrerRetour(id, dto) { return this.service.enregistrerRetour(id, dto); }
    remove(id) { return this.service.remove(id); }
};
exports.LocationsController = LocationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('suivi'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "getSuiviGlobal", null);
__decorate([
    (0, common_1.Get)('suivi/:clientId'),
    __param(0, (0, common_1.Param)('clientId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "getSuiviClient", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [locations_service_1.CreateLocationDto]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id/retour'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, locations_service_1.RetourLocationDto]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "enregistrerRetour", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LocationsController.prototype, "remove", null);
exports.LocationsController = LocationsController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('locations'),
    __metadata("design:paramtypes", [locations_service_1.LocationsService])
], LocationsController);
//# sourceMappingURL=locations.controller.js.map