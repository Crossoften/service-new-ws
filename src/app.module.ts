import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { LoginModule } from './modules/login/login.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ProfileTypesGuard } from './modules/auth/guards/profile-types.guard';
import { UploadModule } from './modules/upload/upload.module';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './modules/mail/mail.module';
import { NoAuthModule } from './modules/no-auth/no-auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AccommodationsModule } from './modules/accommodations/accommodations.module';
import { BalancesModule } from './modules/balances/balances.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { ProductsModule } from './modules/products/products.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ServicesModule } from './modules/services/services.module';
import { TransportationsModule } from './modules/transportations/transportations.module';
import { WebModule } from './modules/web/web.module';
import { WorksModule } from './modules/works/works.module';
import { ChatsModule } from './modules/chats/chats.module';
import { CommercialTransactionsModule } from './modules/commercial-transactions/commercial-transactions.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { RentalsModule } from './modules/rentals/rentals.module';
import { TransportRequestsModule } from './modules/transport-requests/transport-requests.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { FoodOrdersModule } from './modules/food-orders/food-orders.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot({ isGlobal: true }),

    AuthModule,
    LoginModule,
    NoAuthModule,

    UploadModule,
    MailModule,

    //
    AdminModule,

    //
    AccommodationsModule,
    BalancesModule,
    BankAccountsModule,
    BudgetsModule,
    MobileModule,
    PlansModule,
    ProductsModule,
    ProfileModule,
    ServicesModule,
    TransportationsModule,
    WorksModule,
    ChatsModule,
    CommercialTransactionsModule,
    ReferralsModule,
    RentalsModule,
    TransportRequestsModule,
    BookingsModule,
    JobsModule,
    RestaurantsModule,
    FoodOrdersModule,
    DeliveriesModule,

    //
    WebModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ProfileTypesGuard },
  ],
})
export class AppModule {}
