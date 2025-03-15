import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-posiciones',
  imports: [],
  templateUrl: './posiciones.component.html',
  styleUrl: './posiciones.component.scss'
})
export class PosicionesComponent {

  constructor(private router: Router) {}

  regresar() {
    this.router.navigate(['/grupos-activos']); // Ajusta la ruta según tu configuración
  }

}
