import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleLogin(): Promise<void> {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response
  ): Promise<void> {
    const user = req.user;
    const userAgent = req.headers['user-agent'] || 'unknown';

    const tokens = await this.authService.createSession(user.id, userAgent);

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectPath = user.onboardedAt ? '/auth/callback' : '/onboarding';

    res.redirect(`${frontendUrl}${redirectPath}`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  async facebookLogin(): Promise<void> {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response
  ): Promise<void> {
    const user = req.user;
    const userAgent = req.headers['user-agent'] || 'unknown';

    const tokens = await this.authService.createSession(user.id, userAgent);

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectPath = user.onboardedAt ? '/auth/callback' : '/onboarding';

    res.redirect(`${frontendUrl}${redirectPath}`);
  }

  @Post('onboarding')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete user onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding completed' })
  async completeOnboarding(
    @CurrentUser() user: User,
    @Body() dto: OnboardingDto
  ): Promise<{ user: User }> {
    const updatedUser = await this.authService.completeOnboarding(user.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      birthDate: dto.birthDate,
      locale: dto.locale,
    });

    return { user: updatedUser };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const refreshToken =
      dto.refreshToken || this.getRefreshTokenFromCookie(req);

    const tokens = await this.authService.refreshAccessToken(refreshToken);

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    res.json({ accessToken: tokens.accessToken });
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke session' })
  async logout(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const refreshToken = this.getRefreshTokenFromCookie(req);
    if (refreshToken) {
      await this.authService.revokeSession(user.id, refreshToken);
    }

    res.clearCookie('refreshToken');
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  async getCurrentUser(@CurrentUser() user: User): Promise<{ user: User }> {
    const userWithMemberships = await this.authService.getUserWithMemberships(
      user.id
    );
    return { user: userWithMemberships! };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });
  }

  private getRefreshTokenFromCookie(req: Request): string {
    return (req.cookies as Record<string, string>)?.refreshToken || '';
  }
}
