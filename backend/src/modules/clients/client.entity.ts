import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { Entree } from '../entrees/entree.entity';
import { Sortie } from '../sorties/sortie.entity';
import { Paiement } from '../paiements/paiement.entity';
import { Location } from '../locations/location.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column({ nullable: true })
  telephone: string;

  @Column({ nullable: true })
  adresse: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: true })
  actif: boolean;

  @OneToMany(() => Reservation, (r) => r.client)
  reservations: Reservation[];

  @OneToMany(() => Entree, (e) => e.client)
  entrees: Entree[];

  @OneToMany(() => Sortie, (s) => s.client)
  sorties: Sortie[];

  @OneToMany(() => Paiement, (p) => p.client)
  paiements: Paiement[];

  @OneToMany(() => Location, (l) => l.client)
  locations: Location[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
