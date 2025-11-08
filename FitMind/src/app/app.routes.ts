import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { Contact } from './contact/contact';
import { RegisterComponent } from './register/register';
import { LoginComponent } from './login/login';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'contact', component: Contact },
    { path: 'register', component: RegisterComponent },
    { path: 'login', component: LoginComponent },


    // { path: '**', redirectTo: '' } // Voliteľné: presmerovanie na Domov pri neznámej ceste

];