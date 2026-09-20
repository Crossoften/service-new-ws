import { Module } from '@nestjs/common';

import { PushModule } from '../push/push.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [WhatsappModule, PushModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
