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
  UnauthorizedException,
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

    this.setRefreshTokenCookie(res, tokens.sessionId, tokens.refreshToken);

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

    this.setRefreshTokenCookie(res, tokens.sessionId, tokens.refreshToken);

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
    const cookieValue = dto.refreshToken || this.getRefreshTokenFromCookie(req);
    const { sessionId, refreshToken } =
      this.parseRefreshTokenCookie(cookieValue);

    const tokens = await this.authService.refreshAccessToken(
      sessionId,
      refreshToken
    );

    this.setRefreshTokenCookie(res, tokens.sessionId, tokens.refreshToken);

    res.json({ accessToken: tokens.accessToken });
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke session' })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const cookieValue = this.getRefreshTokenFromCookie(req);
    if (cookieValue) {
      const { sessionId, refreshToken } =
        this.parseRefreshTokenCookie(cookieValue);
      await this.authService.revokeSession(sessionId, refreshToken);
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
    if (!userWithMemberships) {
      throw new UnauthorizedException('auth.user_not_found');
    }
    return { user: userWithMemberships };
  }

  private setRefreshTokenCookie(
    res: Response,
    sessionId: string,
    refreshToken: string
  ): void {
    const cookieValue = `${sessionId}.${refreshToken}`;
    res.cookie('refreshToken', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });
  }

  private getRefreshTokenFromCookie(req: Request): string {
    return (req.cookies as Record<string, string>)?.refreshToken || '';
  }

  private parseRefreshTokenCookie(cookieValue: string): {
    sessionId: string;
    refreshToken: string;
  } {
    const parts = cookieValue.split('.');
    if (parts.length < 2) {
      return { sessionId: '', refreshToken: '' };
    }
    const sessionId = parts[0];
    const refreshToken = parts.slice(1).join('.');
    return { sessionId, refreshToken };
  }
}
