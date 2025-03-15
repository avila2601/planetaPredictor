
  /*registrar() {
    // Resetear mensajes de error
    this.errorUsuario = '';
    this.errorCorreo = '';
    this.errorContrasena = '';
    this.errorMensaje = '';

    // Validaciones
    if (!this.usuario) {
      this.errorUsuario = 'El usuario es obligatorio';
    } else if (this.usuario.length < 2) {
      this.errorUsuario = 'El usuario debe tener al menos 2 caracteres';
    }

    if (!this.correo) {
      this.errorCorreo = 'El correo electrónico es obligatorio';
    } else if (!this.validarCorreo(this.correo)) {
      this.errorCorreo = 'Correo electrónico no válido';
    }

    if (!this.contrasena) {
      this.errorContrasena = 'La contraseña es obligatoria';
    } else if (this.contrasena.length < 2) {
      this.errorContrasena = 'La contraseña debe tener al menos 2 caracteres';
    }

    // Si hay errores, detener el registro
    if (this.errorUsuario || this.errorCorreo || this.errorContrasena) {
      return;
    }

    // Registrar usuario si todas las validaciones pasaron
    this.authService.registrar(this.usuario, this.correo, this.contrasena).subscribe((success) => {
      if (success) {
        this.router.navigate(['/login']);
      } else {
        this.errorMensaje = 'El usuario o correo ya están registrados';
      }
    });
  }

  private validarCorreo(correo: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
  }
}*/

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent {
  usuario = '';
  correo = '';
  contrasena = '';
  errorUsuario = '';
  errorCorreo = '';
  errorContrasena = ''; // Aquí se guardará el error de contraseña
  mensaje = ''; // Mensaje de éxito o error

  constructor(private authService: AuthService, private router: Router) {}

  registrar() {
    this.errorUsuario = '';
    this.errorCorreo = '';
    this.errorContrasena = ''; // Resetear error de contraseña
    this.mensaje = '';

    // Validaciones
    if (!this.usuario) {
      this.errorUsuario = 'El usuario es obligatorio';
    } else if (this.usuario.length < 2) {
      this.errorUsuario = 'El usuario debe tener al menos 2 caracteres';
    }

    if (!this.correo) {
      this.errorCorreo = 'El correo electrónico es obligatorio';
    } else if (!this.validarCorreo(this.correo)) {
      this.errorCorreo = 'Correo electrónico no válido';
    }

    if (!this.contrasena) {
      this.errorContrasena = 'La contraseña es obligatoria'; // Corrección aquí
    } else if (this.contrasena.length < 2) {
      this.errorContrasena = 'La contraseña debe tener al menos 2 caracteres'; // Corrección aquí
    }

    if (this.errorUsuario || this.errorCorreo || this.errorContrasena) {
      return;
    }

    this.authService.registrar(this.usuario, this.correo, this.contrasena).subscribe((mensaje) => {
      if (mensaje === 'El usuario ya existe') {
        this.errorUsuario = mensaje;
      } else if (mensaje === 'La dirección de correo ingresada ya se encuentra registrada') {
        this.errorCorreo = mensaje;
      } else if (mensaje === 'El usuario se ha creado satisfactoriamente') {
        this.mensaje = mensaje;
        setTimeout(() => this.router.navigate(['/login']), 2000);
      } else {
        this.mensaje = 'Error desconocido al registrar';
      }
    });
  }

  private validarCorreo(correo: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
  }
}

