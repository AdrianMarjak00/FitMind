import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyArvOFbqncllijGFJPoHNEgtPdZPIuCqjQ",
    authDomain: "fitmind-dba6a.firebaseapp.com",
    projectId: "fitmind-dba6a",
    storageBucket: "fitmind-dba6a.firebasestorage.app",
    messagingSenderId: "981233336315",
    appId: "1:981233336315:web:3334043ac9fc1d6a11955e",
    measurementId: "G-74VP65JX6H"
};


export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDB = getFirestore(firebaseApp);

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(),
        provideAnimations()
    ],
};
