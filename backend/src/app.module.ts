import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeedModule } from './seed/seed.module';

import { AuthController } from './controllers/auth.controller';
import { DivisionsController } from './controllers/divisions.controller';
import { RangesController } from './controllers/ranges.controller';
import { PlantationsController } from './controllers/plantations.controller';
import { ActivitiesController } from './controllers/activities.controller';
import { NormsController } from './controllers/norms.controller';
import { ApoController } from './controllers/apo.controller';
import { DashboardController } from './controllers/dashboard.controller';

import { Division } from './entities/division.entity';
import { Range } from './entities/range.entity';
import { Plantation } from './entities/plantation.entity';
import { Activity } from './entities/activity.entity';
import { Norm } from './entities/norm.entity';
import { Apo } from './entities/apo.entity';
import { ApoItem } from './entities/apo-item.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SeedModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: parseInt(configService.get<string>('POSTGRES_PORT') || '5432'),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DB'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User, Division, Range, Plantation, Activity, Norm, Apo, ApoItem
    ])
  ],
  controllers: [
    AppController,
    AuthController,
    DivisionsController,
    RangesController,
    PlantationsController,
    ActivitiesController,
    NormsController,
    ApoController,
    DashboardController
  ],
  providers: [AppService],
})
export class AppModule { }
