import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Client } from '../clients/client.entity';

export enum StatutReservation {
  EN_ATTENTE = 'en_attente',
  CONFIRMEE = 'confirmee',
  ANNULEE = 'annulee',
  TERMINEE = 'terminee',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, (c) => c.reservations, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'date' })
  dateReservation: string;

  @Column({ type: 'date', nullable: true })
  dateSortiePrevisionnelle: string;

  @Column({ type: 'int', default: 0 })
  nbCaissesBois: number;

  @Column({ type: 'int', default: 0 })
  nbCaissesPластique: number;

  @Column({ type: 'int', default: 0 })
  nbCaissesTranger: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prixUnitaireBois: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prixUnitairePlastique: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prixUnitaireTranger: number;

  @Column({
    type: 'enum',
    enum: StatutReservation,
    default: StatutReservation.EN_ATTENTE,
  })
  statut: StatutReservation;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get totalCaisses(): number {
    return (
      (Number(this.nbCaissesBois) || 0) +
      (Number(this.nbCaissesPластique) || 0) +
      (Number(this.nbCaissesTranger) || 0)
    );
  }

  get montantTotal(): number {
    return (
      (Number(this.nbCaissesBois) || 0) * (Number(this.prixUnitaireBois) || 0) +
      (Number(this.nbCaissesPластique) || 0) * (Number(this.prixUnitairePlastique) || 0) +
      (Number(this.nbCaissesTranger) || 0) * (Number(this.prixUnitaireTranger) || 0)
    );
  }
}
