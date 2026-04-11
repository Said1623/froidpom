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
      url: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      synchronize: true,
      autoLoadEntities: true,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
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
export class AppModule { }
