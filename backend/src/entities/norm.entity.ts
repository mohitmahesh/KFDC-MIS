import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Activity } from './activity.entity';

@Entity('norms_config')
export class Norm {
    @PrimaryColumn()
    id: string;

    @Column({ name: 'activity_id' })
    activity_id: string;

    @ManyToOne(() => Activity)
    @JoinColumn({ name: 'activity_id' })
    activity: Activity;

    @Column({ name: 'applicable_age', type: 'int' })
    applicable_age: number;

    @Column({ name: 'species_id', type: 'varchar', nullable: true })
    species_id: string | null;

    @Column({ name: 'standard_rate', type: 'float' })
    standard_rate: number;

    @Column({ name: 'financial_year' })
    financial_year: string;
}
