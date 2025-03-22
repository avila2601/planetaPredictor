import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  usuario = '';
  contrasena = '';
  errorMensaje = '';
  isAuthenticated = false;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Subscribe to authentication state
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isAuthenticated = !!user;
        if (user) {
          this.usuario = user.username || '';
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login() {
    const usuarioLower = this.usuario.trim().toLowerCase();

    this.authService.login(usuarioLower, this.contrasena).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ Login successful');
          this.isAuthenticated = true;
          this.router.navigate(['/grupos-activos']);
        } else {
          console.log('❌ Login failed');
          this.errorMensaje = 'Usuario o contraseña incorrectos';
        }
      },
      error: (error) => {
        console.error('❌ Login error:', error);
        this.errorMensaje = 'Error al intentar iniciar sesión';
      }
    });
  }

  logout() {
    this.authService.logout();
    this.usuario = '';
    this.contrasena = '';
    this.errorMensaje = '';
  }
}
