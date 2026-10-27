import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { PrismaService } from '@database/PrismaService';

@Module({
  controllers: [UploadController],
  providers: [UploadService, PrismaService],
  // Exportado para o módulo de admin poder limpar a imagem antiga de uma
  // categoria ao trocá-la.
  exports: [UploadService],
})
export class UploadModule {}
