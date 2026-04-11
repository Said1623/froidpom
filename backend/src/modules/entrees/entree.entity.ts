import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn
} from 'typeorm';
import { Client } from '../clients/client.entity';
import { Chambre } from '../chambres/chambre.entity';

@Entity('entrees')
export class Entree {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, (c) => c.entrees, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Chambre, (c) => c.entrees, { eager: true })
  @JoinColumn({ name: 'chambre_id' })
  chambre: Chambre;

  @Column({ type: 'date' })
  dateEntree: string;

  @Column({ type: 'int' })
  nbCaisses: number;

  @Column({ type: 'varchar', length: 20, default: 'bois' })
  typeCaisse: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
