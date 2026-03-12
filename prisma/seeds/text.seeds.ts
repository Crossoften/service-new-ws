import { PrismaClient, TextType } from '@prisma/client';
import { aboutText } from './texts/aboutText';
import { cookieText } from './texts/cookieText';
import { policyText } from './texts/policyText';
import { termsText } from './texts/termsText';
import { tipsText } from './texts/tipsText';

export async function seedText(prisma: PrismaClient) {
  await prisma.text.createMany({
    data: [
      {
        text: aboutText,
        type: TextType.About,
      },
      {
        text: cookieText,
        type: TextType.Cookies,
      },
      {
        text: policyText,
        type: TextType.Policies,
      },
      {
        text: termsText,
        type: TextType.Terms,
      },
      {
        text: tipsText,
        type: TextType.Tips,
      },
    ],
  });

  console.log('Texts seed added successfully 🌱.');
}
