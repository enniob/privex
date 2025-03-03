import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent) },
    { path: 'chat', loadComponent: () => import('./main/main.component').then((m) => m.MainComponent) }
];
