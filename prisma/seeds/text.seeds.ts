import { PrismaClient, TextType } from '@prisma/client';
import { aboutText } from './texts/aboutText';
import { cookieText } from './texts/cookieText';
import { policyText } from './texts/policyText';
import { termsText } from './texts/termsText';
import { tipsText } from './texts/tipsText';

export async function seedText(prisma: PrismaClient) {
  const textos = [
    { type: TextType.About, text: aboutText },
    { type: TextType.Cookies, text: cookieText },
    { type: TextType.Policies, text: policyText },
    { type: TextType.Terms, text: termsText },
    { type: TextType.Tips, text: tipsText },
  ];

  // `Text.type` não tem constraint única no schema, então não dá para usar
  // `upsert`. Antes era `createMany` puro: cada execução do seed inseria mais
  // cinco linhas, e a leitura passava a devolver uma versão arbitrária entre as
  // duplicatas. Aqui o texto é atualizado no lugar quando já existe.
  for (const conteudo of textos) {
    const existente = await prisma.text.findFirst({
      where: { type: conteudo.type },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    if (existente) {
      await prisma.text.update({ where: { id: existente.id }, data: { text: conteudo.text } });
      continue;
    }

    await prisma.text.create({ data: conteudo });
  }
}
