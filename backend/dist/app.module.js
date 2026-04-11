"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const chambres_module_1 = require("./modules/chambres/chambres.module");
const clients_module_1 = require("./modules/clients/clients.module");
const reservations_module_1 = require("./modules/reservations/reservations.module");
const entrees_module_1 = require("./modules/entrees/entrees.module");
const sorties_module_1 = require("./modules/sorties/sorties.module");
const paiements_module_1 = require("./modules/paiements/paiements.module");
const locations_module_1 = require("./modules/locations/locations.module");
const stock_module_1 = require("./modules/stock/stock.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const auth_module_1 = require("./modules/auth/auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 5433,
                username: process.env.DB_USERNAME || 'postgres',
                password: process.env.DB_PASSWORD || 'postgres',
                database: process.env.DB_DATABASE || 'froidpomme',
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: process.env.NODE_ENV === 'development',
                logging: false,
            }),
            chambres_module_1.ChambresModule,
            clients_module_1.ClientsModule,
            reservations_module_1.ReservationsModule,
            entrees_module_1.EntreesModule,
            sorties_module_1.SortiesModule,
            paiements_module_1.PaiementsModule,
            locations_module_1.LocationsModule,
            stock_module_1.StockModule,
            dashboard_module_1.DashboardModule,
            auth_module_1.AuthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map