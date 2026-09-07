import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { extname } from 'path';

import { IsPublic } from '../auth/decorators/is-public.decorator';
import { resolveCategoryIconPath } from './category-icon-file';

const TIPOS: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

@ApiTags('Ícones de categoria')
@Controller('category-icons')
export class CategoryIconsController {
  @Get(':vertical/:fileName')
  @IsPublic()
  @ApiOperation({
    summary: 'Serve o ícone de uma categoria.',
    description:
      'Pública por desenho: é imagem de vitrine, exibida antes de qualquer login. A URL ' +
      'devolvida em `iconUrl` nas rotas de categoria aponta para cá quando os ícones são ' +
      'servidos pela própria API. Definindo SERVICE_CATEGORY_PUBLIC_URL_BASE, as URLs ' +
      'passam a apontar para o host externo e esta rota deixa de ser usada.',
  })
  @ApiResponse({ status: 200, description: 'Ícone encontrado.' })
  @ApiResponse({ status: 404, description: 'Ícone não encontrado.' })
  serve(
    @Param('vertical') vertical: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const caminho = resolveCategoryIconPath(vertical, fileName);

    if (!caminho) throw new NotFoundException('Ícone não encontrado.');

    res.set({
      'Content-Type': TIPOS[extname(caminho).toLowerCase()] || 'application/octet-stream',
      // Ícone de categoria muda raramente e é pedido em toda abertura de tela.
      'Cache-Control': 'public, max-age=86400',
    });

    return createReadStream(caminho).pipe(res);
  }
}
