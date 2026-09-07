import { Module } from '@nestjs/common';

import { CategoryIconsController } from './category-icons.controller';

@Module({
  controllers: [CategoryIconsController],
})
export class CategoryIconsModule {}
