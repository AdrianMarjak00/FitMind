import { Routes } from '@angular/router';

import { HomeComponent } from './home/home';
import { Contact } from './contact/contact';
import { RegisterComponent } from './register/register';
import { LoginComponent } from './login/login';
import { AdminGuard } from '../guards/admin.guard';
import { ReviewsComponent } from './reviews/reviews';
import { Piechart } from './piechart/piechart';
import { Jedalnicek } from './jedalnicek/jedalnicek';
import { Training } from './training/training';
import { DashboardComponent } from './dashboard/dashboard';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'contact', component: Contact },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'piechart', component: Piechart, canActivate: [AdminGuard] },
    { path: 'review', component: ReviewsComponent },
    { path: 'jedalnicek', component: Jedalnicek  },
    { path: 'training', component: Training },


    { path: '**', redirectTo: '' }
];
