import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Division } from './division.entity';
import { Range } from './range.entity';

@Entity('users')
export class User {
    @PrimaryColumn()
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    name: string;

    @Column()
    role: string;

    @Column({ name: 'division_id', type: 'varchar', nullable: true })
    division_id: string | null;

    @ManyToOne(() => Division)
    @JoinColumn({ name: 'division_id' })
    division: Division;

    @Column({ name: 'range_id', type: 'varchar', nullable: true })
    range_id: string | null;

    @ManyToOne(() => Range)
    @JoinColumn({ name: 'range_id' })
    range: Range;
}
