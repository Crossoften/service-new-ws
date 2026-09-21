import { Module } from '@nestjs/common';

import { SmsModule } from '../sms/sms.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { VerificationCodeService } from './verification-code.service';

@Module({
  imports: [WhatsappModule, SmsModule],
  providers: [VerificationCodeService],
  exports: [VerificationCodeService],
})
export class VerificationCodeModule {}
