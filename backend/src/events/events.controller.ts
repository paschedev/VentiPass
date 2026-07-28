import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { Prisma, StaffRole, CommissionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @Get('organizer/me')
  findMyEvents(@Req() req: any) {
    return this.eventsService.findByOrganizer(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @Get('organizer/stats')
  getOrganizerStats(@Req() req: any) {
    return this.eventsService.getOrganizerStats(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.eventsService.create(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.eventsService.update(id, req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @Put(':id/batches')
  updateBatches(
    @Param('id') eventId: string, 
    @Body() body: { batches: any[] }, 
    @Req() req: any
  ) {
    return this.eventsService.updateBatches(eventId, req.user.userId, body.batches);
  }

  // --- STAFF ENDPOINTS ---

  @UseGuards(JwtAuthGuard)
  @Get('promoter/me')
  getMyPromoterStats(@Req() req: any) {
    return this.eventsService.getMyPromoterStats(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @Post(':id/staff')
  addStaff(
    @Param('id') eventId: string, 
    @Body() body: { email: string, role: StaffRole, commissionType?: CommissionType, commissionValue?: number }, 
    @Req() req: any
  ) {
    return this.eventsService.addStaff(eventId, req.user.userId, body.email, body.role, body.commissionType, body.commissionValue);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @Get(':id/staff')
  getStaff(@Param('id') eventId: string, @Req() req: any) {
    return this.eventsService.getEventStaff(eventId, req.user.userId);
  }
}
