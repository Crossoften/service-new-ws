import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  GetObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { File, Role, User } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, extname, join, resolve } from 'path';
import { Readable } from 'stream';
import { UploadAccessDeniedException } from './exceptions/upload-access-denied.exception';
import { ResponseDeleteOneFileDto } from './dto/response-delete-one-file.dto';
import { ResponseOneFileDto } from './dto/response-one-file.dto';
import { UploadFileNotFoundException } from './exceptions/upload-file-not-found.exception';
import { UploadUserNotFoundException } from './exceptions/upload-user-not-found.exception';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string;
  private readonly localDir: string;
  private readonly publicApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME');

    // Sem as quatro variáveis, o cliente do S3 era construído mesmo assim e o
    // `send` estourava a cada upload — a rota respondia 500 e a descrição dela
    // já prometia "local/nuvem". Aqui a ausência apenas escolhe o disco.
    this.s3Client =
      region && accessKeyId && secretAccessKey && this.bucketName
        ? new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
        : null;

    this.localDir = resolve(this.configService.get<string>('UPLOAD_LOCAL_DIR') || 'uploads');
    this.publicApiUrl = (
      this.configService.get<string>('URL_INTEGRATION') ||
      `http://localhost:${this.configService.get<string>('PORT') || 8000}`
    ).replace(/\/+$/, '');

    if (!this.s3Client) {
      this.logger.warn(
        `S3 não configurado; uploads vão para o disco em ${this.localDir}. ` +
          'Adequado a desenvolvimento e homologação, não a produção com mais de uma instância.',
      );
    }
  }

  usesS3(): boolean {
    return this.s3Client !== null;
  }

  /**
   * Nome de arquivo seguro para virar chave de storage.
   *
   * `file.originalname` vem do cliente e ia direto para a chave. Um nome como
   * `../../etc/cron.d/x` viraria escrita fora do diretório de uploads assim que
   * o destino passou a ser o disco — no S3 o efeito era só uma chave estranha,
   * no disco é travessia de caminho.
   */
  private safeKey(originalName: string): string {
    const apenasArquivo = basename(originalName || 'arquivo');
    const extensao = extname(apenasArquivo).slice(0, 12);
    const semExtensao = apenasArquivo
      .slice(0, apenasArquivo.length - extensao.length)
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);

    return `${Date.now()}-${semExtensao || 'arquivo'}${extensao.replace(/[^a-zA-Z0-9.]/g, '')}`;
  }

  private async storeLocally(key: string, body: Buffer): Promise<void> {
    await mkdir(this.localDir, { recursive: true });

    const destino = resolve(join(this.localDir, key));

    // Segunda barreira, depois do `safeKey`: o caminho final tem de continuar
    // dentro do diretório de uploads.
    if (!destino.startsWith(this.localDir)) {
      throw new UploadAccessDeniedException();
    }

    await writeFile(destino, body);
  }

  private async store(file: Express.Multer.File): Promise<string> {
    const key = this.safeKey(file.originalname);

    if (this.s3Client) {
      const uploadParams: PutObjectCommandInput = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: ObjectCannedACL.public_read,
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));
    } else {
      await this.storeLocally(key, file.buffer);
    }

    return key;
  }

  async uploadOneFile(file: Express.Multer.File, currentUser: User): Promise<ResponseOneFileDto> {
    const key = await this.store(file);

    return this.persist(key, currentUser.id);
  }

  async uploadManyFiles(
    files: Express.Multer.File[],
    currentUser: User,
  ): Promise<ResponseOneFileDto[]> {
    const salvos: ResponseOneFileDto[] = [];

    // Sequencial de propósito: `Date.now()` compõe a chave, e em paralelo dois
    // arquivos enviados no mesmo milissegundo colidiriam.
    for (const file of files) {
      const key = await this.store(file);

      salvos.push(await this.persist(key, currentUser.id));
    }

    return salvos;
  }

  /**
   * Registra o arquivo na tabela `files`.
   *
   * Antes, o upload gravava só no S3 e nada era persistido — por isso
   * `GET /one-file/{id}`, o download e o `DELETE /one-file/{id}` respondiam
   * 404 para qualquer id: a tabela nunca recebia uma linha sequer.
   */
  private async persist(fileKey: string, userId: number): Promise<ResponseOneFileDto> {
    if (this.s3Client) {
      const fileUrl = `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`;

      const created = await this.prisma.file.create({
        data: { fileUrl, fileKey, userId },
        select: { id: true, fileUrl: true, fileKey: true },
      });

      return { id: created.id, fileUrl: created.fileUrl, fileKey: created.fileKey };
    }

    // No disco, o arquivo é servido pela própria API. A URL usa a `fileKey`, não
    // o id: no S3 os objetos são gravados com `public_read` e a proteção é a
    // chave ser difícil de adivinhar. Servir por id sequencial seria enumerável
    // — qualquer um baixaria todos os anexos contando de 1 em diante.
    const fileUrl = `${this.publicApiUrl}/v1/files/${fileKey}`;

    const created = await this.prisma.file.create({
      data: { fileUrl, fileKey, userId },
      select: { id: true, fileUrl: true, fileKey: true },
    });

    return { id: created.id, fileUrl: created.fileUrl, fileKey: created.fileKey };
  }

  /**
   * Abre um arquivo local pela chave, para a rota pública de leitura.
   *
   * Só existe quando o armazenamento é em disco: com S3 configurado, a URL
   * pública é a do próprio bucket e esta rota não tem o que servir.
   */
  async openLocalByKey(fileKey: string): Promise<{ stream: Readable; fileName: string }> {
    if (this.s3Client) throw new UploadFileNotFoundException();

    const caminho = resolve(join(this.localDir, basename(fileKey)));

    if (!caminho.startsWith(this.localDir) || !existsSync(caminho)) {
      throw new UploadFileNotFoundException();
    }

    return { stream: createReadStream(caminho), fileName: basename(fileKey) };
  }

  /**
   * Abre o arquivo para download, seja ele do S3 ou do disco.
   *
   * Estava no controller, montando um `S3Client` próprio — o que amarrava o
   * download à nuvem mesmo quando o upload tinha ido para o disco.
   */
  async openForDownload(
    id: number,
  ): Promise<{ stream: Readable; contentType: string; fileName: string }> {
    const file = await this.getFileById(id);

    if (this.s3Client) {
      const { Body, ContentType } = await this.s3Client.send(
        new GetObjectCommand({ Bucket: this.bucketName, Key: file.fileKey }),
      );

      if (!Body) throw new UploadFileNotFoundException();

      return {
        stream: Body instanceof Readable ? Body : Readable.from(Body as never),
        contentType: ContentType || 'application/octet-stream',
        fileName: file.fileKey,
      };
    }

    const caminho = resolve(join(this.localDir, basename(file.fileKey)));

    if (!caminho.startsWith(this.localDir) || !existsSync(caminho)) {
      throw new UploadFileNotFoundException();
    }

    return {
      stream: createReadStream(caminho),
      contentType: 'application/octet-stream',
      fileName: file.fileKey,
    };
  }

  private async removeFromStorage(fileKey: string): Promise<void> {
    if (this.s3Client) {
      const deleteParams: DeleteObjectCommandInput = { Bucket: this.bucketName, Key: fileKey };

      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      return;
    }

    const caminho = resolve(join(this.localDir, basename(fileKey)));

    // Arquivo já ausente não é erro: o registro no banco é a fonte de verdade,
    // e falhar aqui deixaria a linha órfã para sempre.
    if (caminho.startsWith(this.localDir) && existsSync(caminho)) {
      await unlink(caminho);
    }
  }

  async getFileById(id: number): Promise<File> {
    const file: File | null = await this.prisma.file.findFirst({ where: { id } });

    if (!file) throw new UploadFileNotFoundException();

    return file;
  }

  async deleteProfilePhoto(fileKey: string, currentUser: User): Promise<Partial<User>> {
    const user: Partial<User> = await this.getUserByFileKey(fileKey);

    // Antes, a rota era pública e localizava o dono pela própria fileKey — ou
    // seja, qualquer um apagava a foto de qualquer usuário informando a chave.
    this.assertOwnership(user.id, currentUser);

    await this.removeFromStorage(fileKey);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { fileUrl: null, fileKey: null },
    });

    const userUpdated: Partial<User> = await this.getUserById(user.id);

    return userUpdated;
  }

  async deleteFileById(id: number, currentUser: User): Promise<{ message: string }> {
    const file = await this.getFileById(id);

    this.assertOwnership(file.userId, currentUser);

    await this.removeFromStorage(file.fileKey);

    await this.prisma.file.delete({ where: { id } });

    return { message: 'Arquivo deletado com sucesso.' };
  }

  /**
   * Só o dono do recurso — ou um administrador — pode removê-lo.
   */
  private assertOwnership(ownerId: number, currentUser: User): void {
    const isAdmin = currentUser.role === Role.Admin || currentUser.role === Role.Master;

    if (!isAdmin && ownerId !== currentUser.id) {
      throw new UploadAccessDeniedException();
    }
  }

  private async getUserByFileKey(fileKey: string): Promise<ResponseDeleteOneFileDto> {
    const user: Partial<User> | null = await this.prisma.user.findFirst({
      where: { fileKey },
      select: { id: true, name: true, fileUrl: true, fileKey: true },
    });

    if (!user) throw new UploadUserNotFoundException();

    return user;
  }

  private async getUserById(id: number): Promise<ResponseDeleteOneFileDto> {
    const user: Partial<User> | null = await this.prisma.user.findFirst({
      where: { id },
      select: { id: true, name: true, fileUrl: true, fileKey: true },
    });

    if (!user) throw new UploadUserNotFoundException();

    return user;
  }
}
