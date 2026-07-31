import { ApiProperty } from '@nestjs/swagger';
import { Status, UserProfileType } from '@prisma/client';

class ReferredUserDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'João Carlos', type: String })
  name: string;

  @ApiProperty({ example: 'joao@email.com', type: String })
  email: string;

  @ApiProperty({ required: false, nullable: true, example: '(34) 9 9290-0000', type: String })
  phone?: string;

  @ApiProperty({ enum: UserProfileType, enumName: 'UserProfileType' })
  profileType: UserProfileType;

  @ApiProperty({ enum: Status, enumName: 'Status' })
  status: Status;

  @ApiProperty({ example: '2026-03-16T10:00:00.000Z', type: String })
  registeredAt: Date;
}

class MyReferralDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Convertido', type: String })
  status: string;

  @ApiProperty({ required: false, nullable: true, example: 50.0, type: Number })
  commissionAmount: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  paidAt: Date | null;

  @ApiProperty({ example: '2026-03-16T10:00:00.000Z', type: String })
  createdAt: Date;

  @ApiProperty({ type: ReferredUserDto })
  referredUser: ReferredUserDto;
}

export class ResponseMyReferralsDto {
  @ApiProperty({ required: false, nullable: true, example: 'joaocarlos', type: String })
  referralCode?: string;

  @ApiProperty({ type: [MyReferralDto] })
  referrals: MyReferralDto[];

  @ApiProperty({ example: 10, type: Number })
  totalRecords: number;
}
