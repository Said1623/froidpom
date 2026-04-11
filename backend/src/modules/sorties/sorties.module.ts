import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sortie } from './sortie.entity';
import { SortiesService } from './sorties.service';
import { SortiesController } from './sorties.controller';
import { ChambresModule } from '../chambres/chambres.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sortie]), ChambresModule],
  controllers: [SortiesController],
  providers: [SortiesService],
  exports: [SortiesService],
})
export class SortiesModule {}
