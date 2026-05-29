import { Routes } from '@angular/router';

export const routes: Routes = [
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