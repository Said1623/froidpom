import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { PaiementCharge } from './paiement-charge.entity';

@Entity('charges')
export class Charge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  libelle: string;

  @Column({ length: 100 })
  categorie: string;

  @Column({ length: 10, default: '💰' })
  icone: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montantTotal: number;

  @Column({ length: 20, default: 'unique' })
  periodicite: string;

  @Column({ length: 20, nullable: true })
  campagne: string;

  @Column({ type: 'date', nullable: true })
  dateEcheance: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PaiementCharge, p => p.charge, { cascade: true, eager: true })
  paiements: PaiementCharge[];
}