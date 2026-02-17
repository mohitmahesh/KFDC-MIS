import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Range } from './range.entity';

@Entity('divisions')
export class Division {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    code: string;

    @OneToMany(() => Range, (range) => range.division)
    ranges: Range[];
}
