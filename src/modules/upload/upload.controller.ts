import { IfileEntity } from '@interfaces/entities/Ifile.entity';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { DeleteOneFileDto } from './dto/delete-one-file.dto';
import { ResponseDeleteOneFileDto } from './dto/response-delete-one-file.dto';
import { ResponseOneFileDto } from './dto/response-one-file.dto';
import { UploadService } from './upload.service';

const MB = 1024 * 1024;

/**
 * Teto de tamanho por arquivo, aplicado NO MULTER.
 *
 * O `ParseFilePipeBuilder` abaixo também limita, mas ele roda depois: quando a
 * validação dele reprova, o arquivo inteiro já está na memória do processo.
 * Com `limits`, a conexão é cortada ao ultrapassar o teto, e um envio de 2 GB
 * não chega a virar 2 GB de RAM.
 *
 * Dez megabytes cobre foto de celular com folga. Vídeo não passa por aqui: ele
 * sobe direto para o S3 por URL pré-assinada, sem ocupar memória da API.
 */
const LIMITE_POR_ARQUIVO = 10 * MB;

@ApiTags('Upload de arquivos')
@Controller()
export class UploadController {
  constructor(private readonly _uploadService: UploadService) {}

  @Post('upload/one-file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LIMITE_POR_ARQUIVO } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Rota para upload de um arquivo.',
    description:
      'Essa rota aceita arquivos dos tipos png, jpg, jpeg, pdf. Armazena local/nuvem e retorna o link do local de armazenagem.',
  })
  @ApiResponse({ status: 201, type: ResponseOneFileDto })
  @ApiResponse({ status: 422, description: 'Tamanho ou tipo de arquivo inválido.' })
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async uploadOneFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /png|jpg|jpeg|pdf/, skipMagicNumbersValidation: true })
        .addMaxSizeValidator({ maxSize: LIMITE_POR_ARQUIVO })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    const response = await this._uploadService.uploadOneFile(file, user);
    return { ...response };
  }

  @Post('upload/many-files')
  @UseInterceptors(
    FilesInterceptor('files', 5, { limits: { fileSize: LIMITE_POR_ARQUIVO, files: 5 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Rota para upload de múltiplos arquivos.',
    description:
      'Essa rota aceita no máximo 5 arquivos dos tipos png, jpg, jpeg, pdf. Armazena local/nuvem e retorna o link do local de armazenagem.',
  })
  @ApiResponse({ status: 201, type: [ResponseOneFileDto] })
  @ApiResponse({ status: 422, description: 'Tamanho ou tipo de arquivo inválido.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  async uploadManyFiles(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /png|jpg|jpeg|pdf/, skipMagicNumbersValidation: true })
        .addMaxSizeValidator({ maxSize: LIMITE_POR_ARQUIVO })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    const response = await this._uploadService.uploadManyFiles(files, user);
    return response;
  }

  @Get('files/:fileKey')
  @IsPublic()
  @ApiOperation({
    summary: 'Serve um arquivo, do S3 ou do disco.',
    description:
      'É esta a URL gravada em `fileUrl`/`imageUrl` por todo o sistema. O bucket é ' +
      'privado, então o conteúdo passa pela API em vez de ser lido direto do S3. ' +
      'É pública por desenho — a proteção é a chave não ser adivinhável, e é o que ' +
      'permite usar a URL em `<img src>`, que não manda header de autenticação.',
  })
  @ApiResponse({ status: 200, description: 'Arquivo encontrado.' })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado.' })
  async serveFile(@Param('fileKey') fileKey: string, @Res() res: Response) {
    const { stream, fileName, contentType } = await this._uploadService.openByKey(fileKey);

    res.set({
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Type': contentType || tipoPelaExtensao(fileName),
      // A chave carrega o timestamp e nunca é reaproveitada, então o conteúdo
      // de uma chave jamais muda: cachear por um ano é seguro e tira do
      // servidor a banda de reentregar a mesma foto a cada navegação.
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return stream.pipe(res);
  }

  @Get('one-file/:id')
  @ApiOperation({ summary: 'Rota para recuperar informações de um arquivo pelo id.' })
  @ApiResponse({ status: 200, type: IfileEntity })
  async getFileById(@Param('id', ParseIntPipe) id: number) {
    return this._uploadService.getFileById(id);
  }

  @Get('one-file/download/:id')
  @ApiOperation({ summary: 'Rota para download de arquivos.' })
  @ApiProduces('application/octet-stream')
  @ApiResponse({
    status: 200,
    description: 'Download efetuado com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Arquivo não encontrado.',
  })
  async dowload(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { stream, contentType, fileName } = await this._uploadService.openForDownload(id);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${fileName}`,
    });

    return stream.pipe(res);
  }

  @Delete('profile-photo')
  @ApiOperation({ summary: 'Rota para deletar foto de perfil dos usuários.' })
  @ApiResponse({ status: 200, type: ResponseDeleteOneFileDto })
  @ApiQuery({
    name: 'fileKey',
    required: true,
    description: 'A chave do arquivo no S3 a ser excluído',
  })
  async deleteProfilePhoto(@CurrentUser() user: User, @Query() query: DeleteOneFileDto) {
    const { fileKey } = query;
    return this._uploadService.deleteProfilePhoto(fileKey, user);
  }

  @Delete('one-file/:id')
  @ApiOperation({ summary: 'Rota para deletar um arquivo pelo seu id.' })
  @ApiResponse({ status: 200, type: ImessageEntity })
  async deleteFileById(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this._uploadService.deleteFileById(id, user);
  }
}

/**
 * Content-Type a partir da extensão, para o armazenamento em disco.
 *
 * No S3 o tipo foi gravado junto com o objeto e vem de lá. No disco não há
 * onde guardá-lo, e sem um tipo correto o navegador baixa a imagem em vez de
 * exibi-la dentro de `<img>`.
 */
function tipoPelaExtensao(nome: string): string {
  const porExtensao: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
  };

  const ponto = nome.lastIndexOf('.');
  const extensao = ponto === -1 ? '' : nome.slice(ponto).toLowerCase();

  return porExtensao[extensao] || 'application/octet-stream';
}
