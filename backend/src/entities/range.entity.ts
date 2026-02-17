import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Division } from './division.entity';
import { Plantation } from './plantation.entity';

@Entity('ranges')
export class Range {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column({ name: 'division_id' })
    division_id: string;

    @ManyToOne(() => Division, (division) => division.ranges)
    @JoinColumn({ name: 'division_id' })
    division: Division;

    @OneToMany(() => Plantation, (plantation) => plantation.range)
    plantations: Plantation[];
}
