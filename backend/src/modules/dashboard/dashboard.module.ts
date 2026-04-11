import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entree } from '../entrees/entree.entity';
import { Sortie } from '../sorties/sortie.entity';
import { Paiement } from '../paiements/paiement.entity';
import { Reservation } from '../reservations/reservation.entity';
import { Location } from '../locations/location.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ChambresModule } from '../chambres/chambres.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Entree, Sortie, Paiement, Reservation, Location]),
    ChambresModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
