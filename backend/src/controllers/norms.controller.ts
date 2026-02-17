import { Controller, Get, Post, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Norm } from '../entities/norm.entity';
import { Activity } from '../entities/activity.entity';
import { v4 as uuidv4 } from 'uuid';

@Controller('norms')
export class NormsController {
    constructor(
        @InjectRepository(Norm) private normRepo: Repository<Norm>,
        @InjectRepository(Activity) private activityRepo: Repository<Activity>,
    ) { }

    @Get()
    async findAll() {
        const norms = await this.normRepo.find({ relations: ['activity'] });
        return norms.map((n) => ({
            ...n,
            activity_name: n.activity?.name || 'Unknown',
            category: n.activity?.category || 'Unknown',
            unit: n.activity?.unit || 'Unknown',
            ssr_no: n.activity?.ssr_no || '-',
        }));
    }

    @Post()
    create(@Body() body: any) {
        const norm = this.normRepo.create({
            id: uuidv4(),
            activity_id: body.activity_id,
            applicable_age: body.applicable_age,
            species_id: body.species_id || null,
            standard_rate: parseFloat(body.standard_rate),
            financial_year: body.financial_year || '2026-27',
        });
        return this.normRepo.save(norm);
    }
}
