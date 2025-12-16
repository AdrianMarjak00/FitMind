import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { Contact } from './contact/contact';
import { RegisterComponent } from './register/register';
import { LoginComponent } from './login/login';
import { OllamaAi } from './ollama-ai/ollama-ai';
import { AdminGuard } from '../guards/admin.guard';
import { Piechart } from './piechart/piechart';
import { Training } from './training/training';
import { Jedalnicek} from './jedalnicek/jedalnicek';
import { ReviewsComponent } from './reviews/reviews';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'contact', component: Contact },
    { path: 'piechart', component: Piechart, canActivate: [AdminGuard] },
    { path: 'review', component: ReviewsComponent },
    { path: 'ai-chat', component: OllamaAi },
    { path: 'piechart', component: Piechart },

    { path: '**', redirectTo: '' }
];
