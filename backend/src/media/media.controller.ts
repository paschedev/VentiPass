import { Controller, Get, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ensure this matches your auth structure
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('presign')
  @ApiOperation({ summary: 'Obtiene firma temporal para subida segura a Cloudinary' })
  getPresignedToken() {
    return this.mediaService.generateSignature();
  }
}
