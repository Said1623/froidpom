import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entree } from './entree.entity';
import { EntreesService } from './entrees.service';
import { EntreesController } from './entrees.controller';
import { ChambresModule } from '../chambres/chambres.module';

@Module({
  imports: [TypeOrmModule.forFeature([Entree]), ChambresModule],
  controllers: [EntreesController],
  providers: [EntreesService],
  exports: [EntreesService],
})
export class EntreesModule {}
