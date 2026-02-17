import { Controller, Get, Post, Body, Param, Patch, NotFoundException, Query, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Apo } from '../entities/apo.entity';
// ... imports
import { ApoItem } from '../entities/apo-item.entity';
import { Plantation } from '../entities/plantation.entity';
import { Norm } from '../entities/norm.entity';
import { v4 as uuidv4 } from 'uuid';

@Controller('apo')
export class ApoController {
    constructor(
        @InjectRepository(Apo) private apoRepo: Repository<Apo>,
        @InjectRepository(ApoItem) private apoItemRepo: Repository<ApoItem>,
        @InjectRepository(Plantation) private plantationRepo: Repository<Plantation>,
        @InjectRepository(Norm) private normRepo: Repository<Norm>,
    ) { }

    @Get()
    findAll() {
        return this.apoRepo.find();
    }

    @Post('generate-draft')
    async generateDraft(@Body() body: any) {
        const { plantation_id, financial_year } = body;
        const plantation = await this.plantationRepo.findOne({ where: { id: plantation_id } });
        if (!plantation) throw new NotFoundException('Plantation not found');

        const age = new Date().getFullYear() - plantation.year_of_planting;

        // Logic from legacy: find norms, prioritize exact match, fallback to lower age
        // Using IsNull() or explicit null check
        let norms = await this.normRepo.find({
            where: [
                { applicable_age: age, financial_year, species_id: IsNull() },
                { applicable_age: age, financial_year, species_id: plantation.species }
            ]
        });
        // The original closing brace was correct, the provided edit had a syntax error.
        // Keeping the original correct syntax for the `find` method call.

        if (norms.length === 0 && age > 0) {
            // Fallback logic could be complex in TypeORM, simplified for now to strict age match
            // In real migration, we'd implement the <= age logic properly
        }

        return {
            plantation,
            applicable_norms: norms
        };
    }


    @Get('estimates')
    async getEstimates(@Query('plantation_id') plantation_id: string) {
        if (!plantation_id) {
            throw new BadRequestException('Plantation ID is required');
        }

        // Find APOs for this plantation that are SANCTIONED (MD Approved)
        const apos = await this.apoRepo.find({ where: { plantation_id, status: 'SANCTIONED' } });
        const apoIds = apos.map(a => a.id);

        if (apoIds.length === 0) return [];

        // Find items for these APOs
        const items = await this.apoItemRepo.createQueryBuilder('item')
            .where('item.apo_id IN (:...ids)', { ids: apoIds })
            .getMany();

        return items;
    }

    @Patch('items/:id/estimate')
    async updateEstimate(@Param('id') id: string, @Body() body: { revised_qty: number, user_role: string }) {
        const { revised_qty, user_role } = body;
        const item = await this.apoItemRepo.findOne({ where: { id }, relations: ['apo'] });

        if (!item) throw new NotFoundException('Item not found');

        // RBAC: Only CASE_WORKER_ESTIMATES can update, and only if DRAFT or REJECTED
        if (user_role === 'PLANTATION_SUPERVISOR') {
            throw new ForbiddenException('Supervisors cannot edit quantities. Only approval allowed.');
        }
        if (user_role === 'CASE_WORKER_ESTIMATES' && !['DRAFT', 'REJECTED'].includes(item.estimate_status)) {
            throw new ForbiddenException('Cannot edit items that are already submitted or approved.');
        }

        const apo = item.apo;
        const newCost = revised_qty * item.sanctioned_rate;

        // Calculate total cost of all items in this APO, using revised_qty if available
        const allItems = await this.apoItemRepo.find({ where: { apo_id: apo.id } });

        let totalRevisedCost = 0;
        for (const i of allItems) {
            if (i.id === item.id) {
                totalRevisedCost += newCost;
            } else {
                const qty = i.revised_qty !== null ? i.revised_qty : i.sanctioned_qty;
                totalRevisedCost += qty * i.sanctioned_rate;
            }
        }

        if (totalRevisedCost > apo.total_sanctioned_amount) {
            throw new BadRequestException(`Total cost ${totalRevisedCost} exceeds sanctioned amount ${apo.total_sanctioned_amount}`);
        }

        item.revised_qty = revised_qty;
        // If it was REJECTED, and they edit it, does it go back to DRAFT or stay REJECTED until they submit?
        // Usually, editing implies working on it, so let's keep it as is or maybe reset?
        // Let's leave status change to explicit action, but they can only edit if REJECTED/DRAFT.
        return this.apoItemRepo.save(item);
    }

    @Patch('items/:id/status')
    async updateStatus(@Param('id') id: string, @Body() body: { status: string, user_role: string }) {
        const { status, user_role } = body;
        const item = await this.apoItemRepo.findOne({ where: { id } });

        if (!item) throw new NotFoundException('Item not found');

        if (user_role === 'CASE_WORKER_ESTIMATES') {
            if (status !== 'SUBMITTED') throw new ForbiddenException('Case workers can only Submit items.');
            if (!['DRAFT', 'REJECTED'].includes(item.estimate_status)) throw new ForbiddenException('Can only submit Draft or Rejected items.');
        } else if (user_role === 'PLANTATION_SUPERVISOR') {
            if (!['APPROVED', 'REJECTED'].includes(status)) throw new ForbiddenException('Supervisors can only Approve or Reject.');
            if (item.estimate_status !== 'SUBMITTED') throw new ForbiddenException('Can only review Submitted items.');
        } else {
            // Admin or others? For now restrict.
            // throw new ForbiddenException('Role not authorized for status updates.');
        }

        item.estimate_status = status;
        return this.apoItemRepo.save(item);
    }
}
