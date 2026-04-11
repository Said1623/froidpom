import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paiement } from './paiement.entity';
import { PaiementsService } from './paiements.service';
import { PaiementsController } from './paiements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Paiement])],
  controllers: [PaiementsController],
  providers: [PaiementsService],
  exports: [PaiementsService],
})
export class PaiementsModule {}
