import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApoItem } from './apo-item.entity';
import { User } from './user.entity';

@Entity('work_logs')
export class WorkLog {
    @PrimaryColumn()
    id: string;

    @Column({ name: 'apo_item_id' })
    apo_item_id: string;

    @ManyToOne(() => ApoItem)
    @JoinColumn({ name: 'apo_item_id' })
    apoItem: ApoItem;

    @Column({ name: 'work_date' })
    work_date: Date;

    @Column({ name: 'actual_qty', type: 'float' })
    actual_qty: number;

    @Column({ type: 'float' })
    expenditure: number;

    @Column({ name: 'logged_by' })
    logged_by: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'logged_by' })
    logger: User;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;
}
