import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Entree } from '../entrees/entree.entity';

@Entity('chambres')
export class Chambre {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column({ type: 'int' })
  capaciteMax: number;

  @Column({ type: 'int', default: 0 })
  stockActuel: number;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  temperatureCible: number; // en °C

  @OneToMany(() => Entree, (e) => e.chambre)
  entrees: Entree[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get tauxRemplissage(): number {
    if (!this.capaciteMax) return 0;
    return Math.round((this.stockActuel / this.capaciteMax) * 100);
  }

  get disponible(): number {
    return Math.max(0, this.capaciteMax - this.stockActuel);
  }
}
