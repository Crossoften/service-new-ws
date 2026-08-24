import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  ObjectCannedACL,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { File, Role, User } from '@prisma/client';
import { UploadAccessDeniedException } from './exceptions/upload-access-denied.exception';
import { ResponseDeleteOneFileDto } from './dto/response-delete-one-file.dto';
import { ResponseOneFileDto } from './dto/response-one-file.dto';
import { UploadFileNotFoundException } from './exceptions/upload-file-not-found.exception';
import { UploadUserNotFoundException } from './exceptions/upload-user-not-found.exception';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME');
  }

  async uploadOneFile(file: Express.Multer.File, currentUser: User): Promise<ResponseOneFileDto> {
    const uploadParams = {
      Bucket: this.bucketName,
      Key: `${Date.now()}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: ObjectCannedACL.public_read,
    };

    await this.s3Client.send(new PutObjectCommand(uploadParams));

    return this.persist(uploadParams.Key, currentUser.id);
  }

  async uploadManyFiles(
    files: Express.Multer.File[],
    currentUser: User,
  ): Promise<ResponseOneFileDto[]> {
    const uploadPromises = files.map(async (file) => {
      const uploadParams: PutObjectCommandInput = {
        Bucket: this.bucketName,
        Key: `${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: ObjectCannedACL.public_read,
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));

      return this.persist(uploadParams.Key, currentUser.id);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Registra o arquivo na tabela `files`.
   *
   * Antes, o upload gravava só no S3 e nada era persistido — por isso
   * `GET /one-file/{id}`, o download e o `DELETE /one-file/{id}` respondiam
   * 404 para qualquer id: a tabela nunca recebia uma linha sequer.
   */
  private async persist(fileKey: string, userId: number): Promise<ResponseOneFileDto> {
    const fileUrl = `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`;

    const created = await this.prisma.file.create({
      data: { fileUrl, fileKey, userId },
      select: { id: true, fileUrl: true, fileKey: true },
    });

    return { id: created.id, fileUrl: created.fileUrl, fileKey: created.fileKey };
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

    const deleteParams: DeleteObjectCommandInput = {
      Bucket: this.bucketName,
      Key: fileKey,
    };

    await this.s3Client.send(new DeleteObjectCommand(deleteParams));

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

    const deleteParams: DeleteObjectCommandInput = {
      Bucket: this.bucketName,
      Key: file.fileKey,
    };

    await this.s3Client.send(new DeleteObjectCommand(deleteParams));

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
