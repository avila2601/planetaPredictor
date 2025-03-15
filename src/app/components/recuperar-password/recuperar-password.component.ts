import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recuperar-password.component.html',
  styleUrls: ['./recuperar-password.component.scss']
})
export class RecuperarPasswordComponent {
  email = '';
  mensaje = '';

  constructor(private authService: AuthService) {}

  recuperarPassword() {
    if (!this.email.includes('@')) {
      this.mensaje = 'Por favor, introduce un correo válido.';
      return;
    }

    this.authService.enviarRecuperacion(this.email).subscribe((enviado) => {
      if (enviado) {
        this.mensaje = 'Se ha enviado un enlace de recuperación a tu correo.';
      } else {
        this.mensaje = 'El correo no está registrado.';
      }
    });
  }
}
