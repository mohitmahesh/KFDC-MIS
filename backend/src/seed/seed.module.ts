import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Division } from '../entities/division.entity';
import { Range } from '../entities/range.entity';
import { User } from '../entities/user.entity';
import { Activity } from '../entities/activity.entity';
import { Norm } from '../entities/norm.entity';
import { Plantation } from '../entities/plantation.entity';

import { Apo } from '../entities/apo.entity';
import { ApoItem } from '../entities/apo-item.entity';
import { WorkLog } from '../entities/work-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Division, Range, User, Activity, Norm, Plantation, Apo, ApoItem, WorkLog]),
    ],
    providers: [SeedService],
    exports: [SeedService],
})
export class SeedModule { }
