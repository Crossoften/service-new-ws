import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatContextType } from '@prisma/client';
import { ResponseChatOtherUserDto } from './response-chat-messages.dto';

export class ResponseChatLastMessageDto {
  @ApiProperty({ example: 87 })
  id: number;

  @ApiPropertyOptional({
    description: 'Trecho da última mensagem. Nulo quando a mensagem é só um arquivo.',
    example: 'Cheguei no local.',
  })
  message?: string;

  @ApiPropertyOptional({ example: 'comprovante.pdf' })
  fileName?: string;

  @ApiProperty({ description: 'Id de quem enviou a última mensagem.', example: 2 })
  senderId: number;

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  createdAt: Date;
}

export class ResponseChatInboxItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: ChatContextType, enumName: 'ChatContextType' })
  contextType: ChatContextType;

  @ApiProperty({
    description: 'Id da entidade de negócio a que a conversa pertence.',
    example: 12,
  })
  referenceId: number;

  @ApiPropertyOptional({ example: '2026-03-18T14:00:00.000Z' })
  lastMessageAt?: Date;

  @ApiPropertyOptional({
    type: ResponseChatOtherUserDto,
    description: 'A contraparte da conversa. Ausente em sala sem outro participante.',
  })
  otherUser?: ResponseChatOtherUserDto;

  @ApiPropertyOptional({ type: ResponseChatLastMessageDto })
  lastMessage?: ResponseChatLastMessageDto;

  @ApiProperty({
    description: 'Mensagens da contraparte ainda não lidas pelo usuário autenticado.',
    example: 3,
  })
  unreadCount: number;

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-18T14:00:00.000Z' })
  updatedAt: Date;
}

export class ResponseFindChatsDto {
  @ApiProperty({ type: [ResponseChatInboxItemDto] })
  chats: ResponseChatInboxItemDto[];

  @ApiProperty({ description: 'Página atual da consulta.', example: 1 })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3 })
  totalPages: number;

  @ApiProperty({ description: 'Total de conversas encontradas.', example: 42 })
  totalRecords: number;
}
