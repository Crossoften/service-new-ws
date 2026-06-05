import { PartialType } from '@nestjs/swagger'; // ou '@nestjs/mapped-types'
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) { }