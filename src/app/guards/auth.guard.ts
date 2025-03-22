import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    console.log('🔒 AuthGuard: Checking route access:', state.url);

    return this.authService.user$.pipe(
      map(user => {
        const isAuthenticated = !!user;
        console.log('👤 AuthGuard: User state:', { isAuthenticated, userId: user?.id });

        if (!isAuthenticated) {
          console.log('❌ AuthGuard: Not authenticated, redirecting to login');
          return this.router.createUrlTree(['/inicio']);
        }

        console.log('✅ AuthGuard: Access granted for route:', state.url);
        return true;
      }),
      tap(result => {
        console.log('🔄 AuthGuard: Navigation result:', result === true ? 'permitted' : 'denied');
      })
    );
  }
}
