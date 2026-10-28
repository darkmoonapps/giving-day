import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AbilitiesGuard } from './guards/abilities.guard';
import { AbilitiesModule } from '../abilities/abilities.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    ConfigModule,
    AbilitiesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'development-jwt-secret',
      signOptions: {
        expiresIn: 900,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    FacebookStrategy,
    JwtStrategy,
    JwtAuthGuard,
    AbilitiesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, AbilitiesGuard],
})
export class AuthModule {}
