import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn
} from 'typeorm';
import { Client } from '../clients/client.entity';

export enum ModePaiement {
  ESPECES = 'especes',
  VIREMENT = 'virement',
  CHEQUE = 'cheque',
  CARTE = 'carte',
}

@Entity('paiements')
export class Paiement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, (c) => c.paiements, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'date' })
  datePaiement: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  montant: number;

  @Column({
    type: 'enum',
    enum: ModePaiement,
    default: ModePaiement.ESPECES,
  })
  modePaiement: ModePaiement;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
