import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { LoginComponent } from "./components/login/login.component";
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    NavBarComponent,
    LoginComponent,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'planeta-predictor';
  isRegistroRoute = false;

  constructor(private router: Router) {
    // Suscripción a los eventos de navegación
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Actualiza isRegistroRoute solo cuando estamos en la ruta de registro
      this.isRegistroRoute = event.url === '/registro';
    });
  }

  ngOnInit() {
    // Verifica la ruta inicial
    const currentUrl = this.router.url;
    this.isRegistroRoute = currentUrl === '/registro';
  }
}
