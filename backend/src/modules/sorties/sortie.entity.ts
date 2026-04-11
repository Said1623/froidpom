import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn
} from 'typeorm';
import { Client } from '../clients/client.entity';
import { Chambre } from '../chambres/chambre.entity';

@Entity('sorties')
export class Sortie {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, (c) => c.sorties, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Chambre, { eager: true, nullable: true })
  @JoinColumn({ name: 'chambre_id' })
  chambre: Chambre;

  @Column({ type: 'date' })
  dateSortie: string;

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
