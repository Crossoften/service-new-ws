import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    Role,
    SocialNetworkEnum,
    Status,
    UserProfileType,
} from '@prisma/client';

export class ResponseAddressDto {
    @ApiProperty({ example: 1, type: Number })
    id: number;

    @ApiPropertyOptional({ example: 'Rua das Palmeiras', type: String })
    street?: string;

    @ApiPropertyOptional({ example: '458', type: String })
    number?: string;

    @ApiPropertyOptional({ example: 'Centro', type: String })
    neighborhood?: string;

    @ApiPropertyOptional({ example: 'Uberlândia', type: String })
    city?: string;

    @ApiPropertyOptional({ example: 'Minas Gerais', type: String })
    state?: string;

    @ApiPropertyOptional({ example: '38400-000', type: String })
    zipCode?: string;

    @ApiProperty({ example: '2026-03-17T01:00:00.000Z', type: String })
    createdAt: Date;

    @ApiProperty({ example: '2026-03-17T01:00:00.000Z', type: String })
    updatedAt: Date;
}