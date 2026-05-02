import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Location } from './location.entity';
import { Client } from '../clients/client.entity';

@Entity('location_retours')
export class LocationRetour {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Location, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @ManyToOne(() => Client, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'date' })
  dateRetour: string;

  @Column({ type: 'int' })
  nbRetournees: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  typeCaisse: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}