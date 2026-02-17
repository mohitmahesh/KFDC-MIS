import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Range } from './range.entity';

@Entity('plantations')
export class Plantation {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column({ name: 'range_id' })
    range_id: string;

    @ManyToOne(() => Range, (range) => range.plantations)
    @JoinColumn({ name: 'range_id' })
    range: Range;

    @Column()
    species: string;

    @Column({ name: 'year_of_planting', type: 'int' })
    year_of_planting: number;

    @Column({ name: 'total_area_ha', type: 'float' })
    total_area_ha: number;

    @Column({ type: 'varchar', nullable: true })
    village: string | null;

    @Column({ type: 'varchar', nullable: true })
    taluk: string | null;

    @Column({ type: 'varchar', nullable: true })
    district: string | null;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;
}
