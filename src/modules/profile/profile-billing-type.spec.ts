import 'reflect-metadata';
import { UserProfileType } from '@prisma/client';

import { PROFILE_TYPES_KEY } from '../auth/decorators/profile-types.decorator';
import { ProfileController } from './profile.controller';

function perfisExigidos(metodo: keyof ProfileController): UserProfileType[] | undefined {
  return Reflect.getMetadata(PROFILE_TYPES_KEY, ProfileController.prototype[metodo]);
}

describe('PATCH /profile/me/billing-type — restrição de perfil', () => {
  it('exige o perfil Supplier', () => {
    expect(perfisExigidos('updateMyBillingType')).toEqual([UserProfileType.Supplier]);
  });

  it('não vaza a restrição para as outras rotas do perfil', () => {
    // Nome, biografia e endereço continuam abertos a qualquer perfil: a trava é
    // do campo comercial, não do controller inteiro.
    expect(perfisExigidos('updateMine')).toBeUndefined();
    expect(perfisExigidos('updateMyAddress')).toBeUndefined();
  });
});
