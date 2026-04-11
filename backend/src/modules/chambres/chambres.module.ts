// chambres.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chambre } from './chambre.entity';
import { ChambresService } from './chambres.service';
import { ChambresController } from './chambres.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Chambre])],
  controllers: [ChambresController],
  providers: [ChambresService],
  exports: [ChambresService],
})
export class ChambresModule {}
