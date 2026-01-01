import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { Contact } from './contact/contact';
import { RegisterComponent } from './register/register';
import { LoginComponent } from './login/login';
import { AdminGuard } from '../guards/admin.guard';
import { Piechart } from './piechart/piechart';
<<<<<<< HEAD
import { Training } from './training/training';
import { Jedalnicek} from './jedalnicek/jedalnicek';
import { ReviewsComponent } from './reviews/reviews';
=======
import { Jedalnicek } from './jedalnicek/jedalnicek';
import { Training } from './training/training';
import { DashboardComponent } from './dashboard/dashboard';
>>>>>>> origin/AI-posun-trenovanie

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'contact', component: Contact },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'piechart', component: Piechart, canActivate: [AdminGuard] },
    { path: 'review', component: ReviewsComponent },
<<<<<<< HEAD
    { path: 'ai-chat', component: OllamaAi },
    { path: 'piechart', component: Piechart },
=======
    { path: 'jedalnicek', component: Jedalnicek  },
    { path: 'training', component: Training },

>>>>>>> origin/AI-posun-trenovanie

    { path: '**', redirectTo: '' }
];
