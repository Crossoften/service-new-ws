import { ForbiddenException } from '@nestjs/common';

export class ProfileBiographyOnlyForSupplierException extends ForbiddenException {
  constructor() {
    super('Somente usuários supplier podem cadastrar biografia.');
  }
}
