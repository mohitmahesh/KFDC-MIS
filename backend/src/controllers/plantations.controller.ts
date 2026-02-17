import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plantation } from '../entities/plantation.entity';
import { Range } from '../entities/range.entity';
import { Division } from '../entities/division.entity';
import { Apo } from '../entities/apo.entity';
import { v4 as uuidv4 } from 'uuid';

@Controller('plantations')
export class PlantationsController {
    constructor(
        @InjectRepository(Plantation) private plantationRepo: Repository<Plantation>,
        @InjectRepository(Range) private rangeRepo: Repository<Range>,
        @InjectRepository(Division) private divisionRepo: Repository<Division>,
        @InjectRepository(Apo) private apoRepo: Repository<Apo>,
    ) { }

    @Get()
    async findAll() {
        // For now returning all, authentication/filtering to be added later
        const plantations = await this.plantationRepo.find({ relations: ['range'] });

        // Enrich with division name manually if needed, or use proper relation chains
        // Doing manual enrichment to match legacy behavior exactly for now
        const results: any[] = [];
        for (const p of plantations) {
            let divisionName: string | null = null;
            if (p.range) {
                const division = await this.divisionRepo.findOne({ where: { id: p.range.division_id } });
                divisionName = division?.name || null;
            }
            const age = new Date().getFullYear() - p.year_of_planting;
            results.push({
                ...p,
                range_name: p.range?.name || null,
                division_name: divisionName,
                age
            });
        }
        return results;
    }

    @Post()
    async create(@Body() body: any) {
        // Basic implementation, auth check pending
        const plantation = this.plantationRepo.create({
            id: uuidv4(),
            ...body,
            created_at: new Date(),
        });
        return this.plantationRepo.save(plantation);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const p = await this.plantationRepo.findOne({ where: { id }, relations: ['range'] });
        if (!p) throw new NotFoundException('Plantation not found');

        let divisionName: string | null = null;
        if (p.range) {
            const division = await this.divisionRepo.findOne({ where: { id: p.range.division_id } });
            divisionName = division?.name || null;
        }
        const age = new Date().getFullYear() - p.year_of_planting;
        return {
            ...p,
            range_name: p.range?.name || null,
            division_name: divisionName,
            age
        };
    }

    @Get(':id/history')
    async getHistory(@Param('id') id: string) {
        // Authenticate/Authorize if needed
        const apos = await this.apoRepo.find({
            where: { plantation_id: id },
            order: { created_at: 'DESC' },
            relations: ['items'] // Fetch items to show count in frontend
        });
        return apos;
    }
}
