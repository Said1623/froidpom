import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Charge } from './charge.entity';
import { PaiementCharge } from './paiement-charge.entity';
import { ChargesService } from './charges.service';
import { ChargesController } from './charges.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Charge, PaiementCharge])],
  providers: [ChargesService],
  controllers: [ChargesController],
  exports: [ChargesService],
})
export class ChargesModule {}