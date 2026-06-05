import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsInt,
    MaxLength
} from 'class-validator';

export class CreateCategoryDto {
    @IsString({ message: 'O nome deve ser um texto válido.' })
    @IsNotEmpty({ message: 'O nome da categoria é obrigatório.' })
    @MaxLength(120, { message: 'O nome não pode ter mais que 120 caracteres.' })
    name: string;

    @IsString({ message: 'O slug deve ser um texto válido.' })
    @IsNotEmpty({ message: 'O slug é obrigatório.' })
    @MaxLength(120, { message: 'O slug não pode ter mais que 120 caracteres.' })
    slug: string;

    @IsOptional()
    @IsString()
    @MaxLength(1500, { message: 'A URL do ícone excedeu o limite de 1500 caracteres.' })
    iconUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1500, { message: 'A Key do ícone excedeu o limite de 1500 caracteres.' })
    iconKey?: string;

    @IsOptional()
    @IsBoolean({ message: 'O status isActive deve ser um valor booleano (true ou false).' })
    isActive?: boolean;

    @IsOptional()
    @IsInt({ message: 'A ordem de classificação (sortOrder) deve ser um número inteiro.' })
    sortOrder?: number;
}