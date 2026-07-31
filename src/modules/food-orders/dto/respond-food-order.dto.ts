import { ApiProperty } from '@nestjs/swagger';
import { FoodOrderStatusEnum } from '@prisma/client';
import { IsIn } from 'class-validator';

export class RespondFoodOrderDto {
  @ApiProperty({
    description: 'Resposta do restaurante à solicitação de pedido.',
    enum: [FoodOrderStatusEnum.Accepted, FoodOrderStatusEnum.Cancelled],
    example: FoodOrderStatusEnum.Accepted,
  })
  @IsIn([FoodOrderStatusEnum.Accepted, FoodOrderStatusEnum.Cancelled], {
    message: 'A resposta deve ser Accepted ou Cancelled.',
  })
  status: typeof FoodOrderStatusEnum.Accepted | typeof FoodOrderStatusEnum.Cancelled;
}
