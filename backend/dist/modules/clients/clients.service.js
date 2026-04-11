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
exports.ClientsService = exports.UpdateClientDto = exports.CreateClientDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const client_entity_1 = require("./client.entity");
const class_validator_1 = require("class-validator");
class CreateClientDto {
}
exports.CreateClientDto = CreateClientDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "nom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "telephone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "adresse", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "email", void 0);
class UpdateClientDto {
}
exports.UpdateClientDto = UpdateClientDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClientDto.prototype, "nom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClientDto.prototype, "telephone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClientDto.prototype, "adresse", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateClientDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateClientDto.prototype, "actif", void 0);
let ClientsService = class ClientsService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(search) {
        if (search) {
            return this.repo.find({
                where: [{ nom: (0, typeorm_2.ILike)(`%${search}%`) }, { telephone: (0, typeorm_2.ILike)(`%${search}%`) }],
                order: { nom: 'ASC' },
            });
        }
        return this.repo.find({ order: { nom: 'ASC' } });
    }
    async findOne(id) {
        const c = await this.repo.findOne({
            where: { id },
            relations: ['reservations', 'entrees', 'sorties', 'paiements', 'locations'],
        });
        if (!c)
            throw new common_1.NotFoundException(`Client #${id} introuvable`);
        return c;
    }
    create(dto) {
        return this.repo.save(this.repo.create(dto));
    }
    async update(id, dto) {
        const client = await this.findOne(id);
        Object.assign(client, dto);
        return this.repo.save(client);
    }
    async remove(id) {
        const client = await this.findOne(id);
        client.actif = false;
        return this.repo.save(client);
    }
    async getStockClient(clientId) {
        const client = await this.repo.findOne({
            where: { id: clientId },
            relations: ['entrees', 'entrees.chambre', 'sorties'],
        });
        if (!client)
            throw new common_1.NotFoundException(`Client #${clientId} introuvable`);
        return client;
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ClientsService);
//# sourceMappingURL=clients.service.js.map