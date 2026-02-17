import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Apo } from './apo.entity';
import { Activity } from './activity.entity';

@Entity('apo_items')
export class ApoItem {
    @PrimaryColumn()
    id: string;

    @Column({ name: 'apo_id' })
    apo_id: string;

    @ManyToOne(() => Apo)
    @JoinColumn({ name: 'apo_id' })
    apo: Apo;

    @Column({ name: 'activity_id' })
    activity_id: string;

    @ManyToOne(() => Activity)
    @JoinColumn({ name: 'activity_id' })
    activity: Activity;

    @Column({ name: 'activity_name' })
    activity_name: string;

    @Column({ name: 'sanctioned_qty', type: 'float' })
    sanctioned_qty: number;

    @Column({ name: 'sanctioned_rate', type: 'float' })
    sanctioned_rate: number;

    @Column({ name: 'total_cost', type: 'float' })
    total_cost: number;

    @Column({ name: 'revised_qty', type: 'float', nullable: true })
    revised_qty: number | null;

    @Column({ name: 'estimate_status', default: 'DRAFT' })
    estimate_status: string; // DRAFT, SUBMITTED, APPROVED, REJECTED

    @Column()
    unit: string;
}
