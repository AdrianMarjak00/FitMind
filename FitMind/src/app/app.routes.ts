import { Routes } from '@angular/router';

import { HomeComponent } from './home/home';
import { Contact } from './components/contact/contact';
import { RegisterComponent } from './components/register/register';
import { LoginComponent } from './components/login/login';
import { AdminGuard } from '../guards/admin.guard';
import { ReviewsComponent } from './reviews/reviews';
import { Piechart } from './components/piechart/piechart';
import { Jedalnicek } from './components/jedalnicek/jedalnicek';
import { Training } from './components/training/training';
import { DashboardComponent } from './components/dashboard/dashboard';
import { AiChatComponent } from './components/ai-chat/ai-chat';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'contact', component: Contact },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'piechart', component: Piechart, canActivate: [AdminGuard] },
    { path: 'review', component: ReviewsComponent },
    { path: 'jedalnicek', component: Jedalnicek },
    { path: 'training', component: Training },
    { path: 'ai-chat', component: AiChatComponent },

    { path: '**', redirectTo: '' }
];
