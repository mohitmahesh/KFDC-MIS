import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Plantation } from './plantation.entity';
import { User } from './user.entity';

@Entity('apo_headers')
export class Apo {
    @PrimaryColumn()
    id: string;

    @Column({ name: 'plantation_id' })
    plantation_id: string;

    @ManyToOne(() => Plantation)
    @JoinColumn({ name: 'plantation_id' })
    plantation: Plantation;

    @Column({ name: 'financial_year' })
    financial_year: string;

    @Column()
    status: string;

    @Column({ name: 'total_sanctioned_amount', type: 'float' })
    total_sanctioned_amount: number;

    @Column({ name: 'created_by' })
    created_by: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @Column({ name: 'approved_by', nullable: true, type: 'varchar' })
    approved_by: string | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'approved_by' })
    approver: User;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
