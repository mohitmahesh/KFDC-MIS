import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plantation } from '../entities/plantation.entity';
import { Apo } from '../entities/apo.entity';
import { ApoItem } from '../entities/apo-item.entity';

@Controller('dashboard')
export class DashboardController {
    constructor(
        @InjectRepository(Plantation) private plantationRepo: Repository<Plantation>,
        @InjectRepository(Apo) private apoRepo: Repository<Apo>,
        @InjectRepository(ApoItem) private apoItemRepo: Repository<ApoItem>,
    ) { }

    @Get('stats')
    async getStats() {
        // 1. Plantation Stats
        const plantationStats = await this.plantationRepo
            .createQueryBuilder('p')
            .select('COUNT(p.id)', 'count')
            .addSelect('SUM(p.total_area_ha)', 'area')
            .getRawOne();

        const total_plantations = parseInt(plantationStats?.count || '0');
        const total_area_ha = parseFloat(plantationStats?.area || '0');

        // 2. APO Status Stats
        const apoCounts = await this.apoRepo
            .createQueryBuilder('a')
            .select('a.status', 'status')
            .addSelect('COUNT(a.id)', 'count')
            .groupBy('a.status')
            .getRawMany();

        const getCount = (status: string) => {
            const row = apoCounts.find(r => r.status === status);
            return row ? parseInt(row.count) : 0;
        };

        const sanctioned_apos = getCount('SANCTIONED');
        const pending_apos = getCount('PENDING_APPROVAL');
        const draft_apos = getCount('DRAFT');
        const rejected_apos = getCount('REJECTED');

        // 3. Amount Stats
        const amountStats = await this.apoRepo
            .createQueryBuilder('a')
            .select('SUM(a.total_sanctioned_amount)', 'amount')
            .where('a.status = :status', { status: 'SANCTIONED' })
            .getRawOne();

        const total_sanctioned_amount = parseFloat(amountStats?.amount || '0');

        // 4. Budget Chart (Activity-wise breakdown for Sanctioned APOs)
        const budgetData = await this.apoItemRepo
            .createQueryBuilder('item')
            .leftJoin('item.apo', 'apo')
            .where("apo.status = 'SANCTIONED'")
            .select('item.activity_name', 'name')
            .addSelect('SUM(item.total_cost)', 'sanctioned')
            .groupBy('item.activity_name')
            .getRawMany();

        const budget_chart = budgetData.map(b => ({
            name: b.name,
            sanctioned: parseFloat(b.sanctioned || '0'),
            spent: 0
        }));

        const total_expenditure = 0;
        const utilization_pct = total_sanctioned_amount > 0 ? (total_expenditure / total_sanctioned_amount) * 100 : 0;

        return {
            total_plantations,
            total_area_ha,
            sanctioned_apos,
            pending_apos,
            draft_apos,
            rejected_apos,
            total_sanctioned_amount,
            total_expenditure,
            utilization_pct: parseFloat(utilization_pct.toFixed(2)),
            budget_chart
        };
    }
}
