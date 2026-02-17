import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Range } from '../entities/range.entity';

@Controller('ranges')
export class RangesController {
    constructor(
        @InjectRepository(Range) private rangeRepo: Repository<Range>,
    ) { }

    @Get()
    findAll(@Query('division_id') divisionId?: string) {
        if (divisionId) {
            return this.rangeRepo.find({ where: { division_id: divisionId } });
        }
        return this.rangeRepo.find();
    }
}
