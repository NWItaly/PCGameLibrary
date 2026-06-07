// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/privacy/privacy.component').then(m => m.PrivacyComponent)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/game-list/game-list.component')
        .then(m => m.GameListComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];