import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { User, UserProfileType } from '@prisma/client';
import capitalizeFirstLetter from '@utils/capitalizeFirstLetter';
import HandleUpdateUser from '@utils/HandleUpdateUser';
import { ResponseProfileDto } from './dto/response-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileBiographyOnlyForSupplierException } from './exceptions/profile-biography-only-for-supplier.exception';
import { ProfileNotFoundException } from './exceptions/profile-not-found.exception';
import { ProfilePersistenceException } from './exceptions/profile-persistence.exception';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(user: User): Promise<ResponseProfileDto> {
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        phone: true,
        biography: true,
        role: true,
        status: true,
        fileUrl: true,
        fileKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      throw new ProfileNotFoundException();
    }

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      document: profile.document || undefined,
      phone: profile.phone || undefined,
      biography: profile.biography || undefined,
      role: profile.role,
      status: profile.status,
      fileUrl: profile.fileUrl || undefined,
      fileKey: profile.fileKey || undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async updateMine(user: User, payload: UpdateProfileDto): Promise<ResponseProfileDto> {
    if (payload.biography !== undefined && user.profileType !== UserProfileType.Supplier) {
      throw new ProfileBiographyOnlyForSupplierException();
    }

    await HandleUpdateUser.updateUser(user.id, payload);

    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: payload.name ? capitalizeFirstLetter(payload.name.trim()) : undefined,
          document: payload.document,
          email: payload.email,
          phone: payload.phone,
          biography:
            user.profileType === UserProfileType.Supplier
              ? payload.biography
                ? payload.biography.trim()
                : payload.biography
              : undefined,
          fileUrl: payload.fileUrl,
          fileKey: payload.fileKey,
        },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new ProfilePersistenceException();
      }

      throw error;
    }

    return this.findMine(user);
  }
}
