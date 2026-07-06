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
import { UpdateAddressDto } from './dto/update-address-dto';
import { ResponseAddressDto } from './dto/response-address-dto';
import { UpdateBillingTypeDto } from './dto/update-billing-type.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) { }

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
        profileType: true,
        status: true,
        fileUrl: true,
        fileKey: true,
        referralCode: true,
        birthDate: true,
        commissionRate: true,
        billingType: true,
        createdAt: true,
        updatedAt: true,
        socialMedias: {
          select: {
            id: true,
            network: true,
            url: true,
            followers: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { network: 'asc' },
        },
        address: {
          select: {
            id: true,
            street: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
            zipCode: true,
            createdAt: true,
            updatedAt: true,
          },
        },
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
      profileType: profile.profileType,
      status: profile.status,
      fileUrl: profile.fileUrl || undefined,
      fileKey: profile.fileKey || undefined,
      referralCode: profile.referralCode || undefined,
      birthDate: profile.birthDate || undefined,
      commissionRate:
        profile.commissionRate !== null ? Number(profile.commissionRate) : undefined,
      billingType: profile.billingType ?? undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      socialMedias: profile.socialMedias.map((socialMedia) => ({
        id: socialMedia.id,
        network: socialMedia.network,
        url: socialMedia.url,
        followers: socialMedia.followers,
        createdAt: socialMedia.createdAt,
        updatedAt: socialMedia.updatedAt,
      })),
      address: profile.address
        ? {
          id: profile.address.id,
          street: profile.address.street || undefined,
          number: profile.address.number || undefined,
          neighborhood: profile.address.neighborhood || undefined,
          city: profile.address.city || undefined,
          state: profile.address.state || undefined,
          zipCode: profile.address.zipCode || undefined,
          createdAt: profile.address.createdAt,
          updatedAt: profile.address.updatedAt,
        }
        : undefined,
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

  async updateMyAddress(
    user: User,
    payload: UpdateAddressDto,
  ): Promise<ResponseAddressDto> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, addressId: true },
    });

    if (!currentUser) {
      throw new ProfileNotFoundException();
    }

    let address;

    if (currentUser.addressId) {
      address = await this.prisma.address.update({
        where: { id: currentUser.addressId },
        data: {
          street: payload.street,
          number: payload.number,
          neighborhood: payload.neighborhood,
          city: payload.city,
          state: payload.state,
          zipCode: payload.zipCode,
        },
      });
    } else {
      address = await this.prisma.address.create({
        data: {
          street: payload.street,
          number: payload.number,
          neighborhood: payload.neighborhood,
          city: payload.city,
          state: payload.state,
          zipCode: payload.zipCode,
          user: {
            connect: { id: user.id },
          },
        },
      });
    }

    return {
      id: address.id,
      street: address.street || undefined,
      number: address.number || undefined,
      neighborhood: address.neighborhood || undefined,
      city: address.city || undefined,
      state: address.state || undefined,
      zipCode: address.zipCode || undefined,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }


  async updateMyBillingType(
    user: User,
    payload: UpdateBillingTypeDto,
  ): Promise<ResponseProfileDto> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!currentUser) {
      throw new ProfileNotFoundException();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { billingType: payload.billingType ?? null },
    });

    return this.findMine(user);
  }
}

