import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatContextType } from '@prisma/client';

export class ResponseChatParticipantDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Susana Vieira' })
  name: string;

  @ApiPropertyOptional({ example: 'https://cdn.seudominio.com/users/profile.png' })
  fileUrl?: string;

  @ApiPropertyOptional({ example: '2026-03-18T14:00:00.000Z' })
  lastReadAt?: Date;
}

export class ResponseChatMessageSenderDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Joelson Silva' })
  name: string;

  @ApiPropertyOptional({ example: 'https://cdn.seudominio.com/users/profile.png' })
  fileUrl?: string;
}

export class ResponseChatMessageDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 'Cheguei no local.' })
  message?: string;

  @ApiPropertyOptional({ example: 'arquivo.pdf' })
  fileName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.seudominio.com/chats/arquivo.pdf' })
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'chats/arquivo.pdf' })
  fileKey?: string;

  @ApiProperty({ type: ResponseChatMessageSenderDto })
  sender: ResponseChatMessageSenderDto;

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  updatedAt: Date;
}

export class ResponseChatDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: ChatContextType, enumName: 'ChatContextType' })
  contextType: ChatContextType;

  @ApiProperty({ example: 12 })
  referenceId: number;

  @ApiPropertyOptional({ example: '2026-03-18T14:00:00.000Z' })
  lastMessageAt?: Date;

  @ApiProperty({ type: [ResponseChatParticipantDto] })
  participants: ResponseChatParticipantDto[];

  @ApiProperty({ type: [ResponseChatMessageDto] })
  messages: ResponseChatMessageDto[];

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  updatedAt: Date;
}
