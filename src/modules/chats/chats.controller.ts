import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ChatContextType, User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { QueryChatMessagesDto } from './dto/query-chat-messages.dto';
import { ResponseFindChatMessagesDto } from './dto/response-chat-messages.dto';
import { ResponseChatDto } from './dto/response-chat.dto';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';

@ApiTags('Chats')
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly chatsGateway: ChatsGateway,
  ) {}

  @Get('context/:contextType/:referenceId')
  @ApiOperation({
    summary: 'Rota para abrir um chat a partir de um contexto de negócio.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseChatDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async openByContext(
    @CurrentUser() user: User,
    @Param('contextType', new ParseEnumPipe(ChatContextType)) contextType: ChatContextType,
    @Param('referenceId', ParseIntPipe) referenceId: number,
  ): Promise<ResponseChatDto> {
    return this.chatsService.openByContext(user, contextType, referenceId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar um chat pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseChatDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseChatDto> {
    return this.chatsService.findById(user, id);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Rota para listar mensagens de um chat com paginação.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindChatMessagesDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async findMessages(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryChatMessagesDto,
  ): Promise<ResponseFindChatMessagesDto> {
    return this.chatsService.findMessages(user, id, query);
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Rota para enviar mensagem em um chat.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseChatDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CreateChatMessageDto,
  ): Promise<ResponseChatDto> {
    const result = await this.chatsService.sendMessageAndGetLastMessage(user, id, payload);

    try {
      this.chatsGateway.emitToRoom(id, 'chat:message', { roomId: id, message: result.message });
      this.chatsGateway.emitToRoom(id, 'chat:updated', result.room);
    } catch {
      // WebSocket emit falhou — a mensagem já foi salva, não interrompe o response HTTP
    }

    return result.room;
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Rota para marcar um chat como lido pelo usuário atual.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseChatDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseChatDto> {
    const room = await this.chatsService.markAsRead(user, id);

    this.chatsGateway.emitToRoom(id, 'chat:read', { roomId: id, userId: user.id });

    return room;
  }
}
