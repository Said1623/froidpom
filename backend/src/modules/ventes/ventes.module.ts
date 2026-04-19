import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vente } from './vente.entity';
import { VentesService } from './ventes.service';
import { VentesController } from './ventes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vente])],
  controllers: [VentesController],
  providers: [VentesService],
})
export class VentesModule {}