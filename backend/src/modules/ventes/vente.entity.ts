import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Client } from '../clients/client.entity';

@Entity('ventes')
export class Vente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, { eager: true, nullable: false })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'date' })
  dateVente: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantiteTonnes: number;

  @Column({ type: 'varchar', length: 100 })
  villeDestinataire: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  typeMarchandise: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  prixUnitaire: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transporteur: string;

  @Column({ type: 'varchar', length: 50, default: 'en_cours' })
  statut: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}