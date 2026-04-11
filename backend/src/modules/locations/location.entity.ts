import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Client } from '../clients/client.entity';

export enum TypeCaisse {
  BOIS = 'bois',
  PLASTIQUE = 'plastique',
  ETRANGER = 'tranger',
}

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, (c) => c.locations, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'date' })
  dateLocation: string;

  @Column({ type: 'int' })
  nbCaisses: number;

  @Column({ type: 'int', default: 0 })
  nbCaissesRetournees: number;

  @Column({
    type: 'enum',
    enum: TypeCaisse,
    default: TypeCaisse.BOIS,
  })
  typeCaisse: TypeCaisse;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prixUnitaire: number;

  @Column({ nullable: true })
  dateRetourPrevu: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get nbCaissesRestantes(): number {
    return Math.max(0, this.nbCaisses - this.nbCaissesRetournees);
  }

  get montantTotal(): number {
    return this.nbCaisses * Number(this.prixUnitaire);
  }
}
