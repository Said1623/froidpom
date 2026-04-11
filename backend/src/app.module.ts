import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

import { ChambresModule } from './modules/chambres/chambres.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { EntreesModule } from './modules/entrees/entrees.module';
import { SortiesModule } from './modules/sorties/sorties.module';
import { PaiementsModule } from './modules/paiements/paiements.module';
import { LocationsModule } from './modules/locations/locations.module';
import { StockModule } from './modules/stock/stock.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
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
    ChambresModule,
    ClientsModule,
    ReservationsModule,
    EntreesModule,
    SortiesModule,
    PaiementsModule,
    LocationsModule,
    StockModule,
    DashboardModule,
    AuthModule,
  ],
})
export class AppModule {}
