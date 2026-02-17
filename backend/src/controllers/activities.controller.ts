import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../entities/activity.entity';

@Controller('activities')
export class ActivitiesController {
    constructor(
        @InjectRepository(Activity) private activityRepo: Repository<Activity>,
    ) { }

    @Get()
    findAll() {
        return this.activityRepo.find();
    }
}
