import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: 'admin' })
  role: string;

  @Column({ nullable: true })
  nom: string;

  @CreateDateColumn()
  createdAt: Date;
}
