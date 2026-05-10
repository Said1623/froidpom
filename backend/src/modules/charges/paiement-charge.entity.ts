import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Charge } from './charge.entity';

@Entity('paiements_charges')
export class PaiementCharge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Charge, c => c.paiements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charge_id' })
  charge: Charge;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montantPaye: number;

  @Column({ type: 'date' })
  datePaiement: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}