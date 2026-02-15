import { Routes } from '@angular/router';

import { HomeComponent } from './home/home';
import { ContactComponent } from './components/contact/contact';
import { RegisterComponent } from './components/register/register';
import { LoginComponent } from './components/login/login';
import { CompleteProfileComponent } from './components/complete-profile/complete-profile';
import { Piechart } from './components/piechart/piechart';
import { AiChatComponent } from './components/ai-chat/ai-chat';
import { DashboardComponent } from './components/dashboard/dashboard';
import { Reviews } from './reviews/reviews';
import { JedalnicekComponent } from './components/jedalnicek/jedalnicek';
import { Training } from './components/training/training';
import { SettingsComponent } from './components/settings/settings';
import { PaymentSuccessComponent } from './components/payment-success/payment-success';
import { AdminGuard } from '../guards/admin.guard';
import { AuthGuard } from '../guards/auth.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'complete-profile', component: CompleteProfileComponent },
    { path: 'contact', component: ContactComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
    { path: 'piechart', component: Piechart, canActivate: [AdminGuard] },
    { path: 'review', component: Reviews },
    { path: 'jedalnicek', component: JedalnicekComponent, canActivate: [AuthGuard] },
    { path: 'training', component: Training, canActivate: [AuthGuard] },
    { path: 'ai-chat', component: AiChatComponent, canActivate: [AuthGuard] },
    { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
    { path: 'payment-success', component: PaymentSuccessComponent, canActivate: [AuthGuard] },

    { path: '**', redirectTo: '' }
];