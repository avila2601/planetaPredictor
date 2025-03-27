import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  user: User | null = null;
  passwordChange = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  error: string | null = null;
  success: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
    });
  }

  onChangePassword() {
    this.error = null;
    this.success = null;

    if (!this.user) {
      this.error = 'Usuario no encontrado';
      return;
    }

    if (this.passwordChange.newPassword !== this.passwordChange.confirmPassword) {
      this.error = 'Las contraseñas nuevas no coinciden';
      return;
    }

    if (this.passwordChange.currentPassword !== this.user.password) {
      this.error = 'La contraseña actual es incorrecta';
      return;
    }

    // Update password
    const updatedUser = {
      ...this.user,
      password: this.passwordChange.newPassword
    };

    this.authService.updateUser(updatedUser).subscribe({
      next: () => {
        this.success = 'Contraseña actualizada exitosamente';
        this.passwordChange = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
      },
      error: () => {
        this.error = 'Error al actualizar la contraseña';
      }
    });
  }
}
