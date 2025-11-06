import { Routes } from '@angular/router';
import { home } from './home/home';
import { Profile } from './profile/profile'; // Predpokladám názov komponentu
import { Contact } from './contact/contact'; // Predpokladám názov komponentu

export const routes: Routes = [
    { path: '', component: home },
    { path: 'profile', component: Profile }, 
    { path: 'contact', component: Contact },
    // { path: '**', redirectTo: '' } // Voliteľné: presmerovanie na Domov pri neznámej ceste
];