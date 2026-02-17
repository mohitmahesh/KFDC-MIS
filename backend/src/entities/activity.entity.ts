import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('activity_master')
export class Activity {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    category: string;

    @Column()
    unit: string;

    @Column({ name: 'ssr_no', type: 'varchar', nullable: true })
    ssr_no: string;
}
