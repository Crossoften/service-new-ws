import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatContextType } from '@prisma/client';
import { ResponseChatMessageDto } from './response-chat.dto';

export class ResponseChatOtherUserDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Susana Vieira' })
  name: string;

  @ApiPropertyOptional({ example: 'https://cdn.seudominio.com/users/profile.png' })
  fileUrl?: string;
}

export class ResponseChatInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: ChatContextType, enumName: 'ChatContextType' })
  contextType: ChatContextType;

  @ApiProperty({ example: 12 })
  referenceId: number;

  @ApiPropertyOptional({ example: '2026-03-18T14:00:00.000Z' })
  lastMessageAt?: Date;

  @ApiPropertyOptional({ type: ResponseChatOtherUserDto })
  otherUser?: ResponseChatOtherUserDto;

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  updatedAt: Date;
}

export class ResponseFindChatMessagesDto {
  @ApiProperty({ type: ResponseChatInfoDto })
  chat: ResponseChatInfoDto;

  @ApiProperty({ type: [ResponseChatMessageDto] })
  messages: ResponseChatMessageDto[];

  @ApiProperty({ description: 'Página atual da consulta.', example: 1 })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3 })
  totalPages: number;

  @ApiProperty({ description: 'Total de mensagens encontradas.', example: 42 })
  totalRecords: number;
}
