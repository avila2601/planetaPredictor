import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; // Importar Router
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss'
})
export class NavBarComponent implements OnInit {
  isMenuOpen = false;
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdRef: ChangeDetectorRef // Importar ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Suscribirse a los cambios de autenticación en tiempo real
    this.authService.isAuthenticated$.subscribe(status => {
      console.log('Cambio detectado en NavBar:', status); // 🛠 Debug
      this.isAuthenticated = status;
      this.cdRef.detectChanges(); // 🔄 Forzar actualización del navbar si Angular no lo detecta
    });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}
