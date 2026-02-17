import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division } from '../entities/division.entity';

@Controller('divisions')
export class DivisionsController {
    constructor(
        @InjectRepository(Division) private divisionRepo: Repository<Division>,
    ) { }

    @Get()
    findAll() {
        return this.divisionRepo.find();
    }
}
