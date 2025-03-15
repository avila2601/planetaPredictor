import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  usuario = '';
  contrasena = '';
  errorMensaje = '';
  isAuthenticated = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    this.usuario = localStorage.getItem('usuario') || ''; // Recuperar usuario si existe
  }

  login() {
    const usuarioLower = this.usuario.trim().toLowerCase(); // Convertir a minúsculas

    this.authService.login(usuarioLower, this.contrasena).subscribe((success) => {
      if (success) {
        this.isAuthenticated = true;
        localStorage.setItem('isAuthenticated', 'true'); // Guardar estado de autenticación
        localStorage.setItem('usuario', usuarioLower); // Guardar usuario en minúsculas
        this.router.navigate(['/grupos-activos']);
      } else {
        this.errorMensaje = 'Usuario o contraseña incorrectos';
      }
    });
  }

  logout() {
    this.isAuthenticated = false;
    localStorage.removeItem('isAuthenticated'); // Eliminar autenticación
    localStorage.removeItem('usuario'); // Eliminar usuario
    this.router.navigate(['/']).then(() => {
      window.location.reload(); // Asegurar que todo se reinicia
    });
  }
}

