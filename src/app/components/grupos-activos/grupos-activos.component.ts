import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CrearPollaComponent } from '../crear-polla/crearpolla.component';
import { PronosticosComponent } from '../pronosticos/pronosticos.component';
import { PosicionesComponent } from '../posiciones/posiciones.component';
import { PollaService } from '../../services/polla.service';
import { AuthService } from '../../services/auth.service';
import { Polla } from '../../models/polla.model';

@Component({
  selector: 'app-grupos-activos',
  standalone: true,
  imports: [PronosticosComponent, PosicionesComponent, CommonModule, CrearPollaComponent],
  templateUrl: './grupos-activos.component.html',
  styleUrl: './grupos-activos.component.scss'
})
export class GruposActivosComponent implements OnInit {
  mostrarPronostico = false;
  mostrarPosiciones = false;
  puntajeTotal = 0;
  torneos: { id: number; nombre: string }[] = [];
  pollas: Polla[] = [];
  modalAbierto = false;

  constructor(
    private pollaService: PollaService,
    private authService: AuthService,
    private router: Router // Importamos Router
  ) {}

  ngOnInit() {
    this.cargarPollasDelUsuario();
  }

  cargarPollasDelUsuario() {
    this.pollaService.getPollasByLoggedUser().subscribe(pollas => {
      console.log('Pollas recibidas:', pollas);
      this.pollas = pollas;
    });
  }

  obtenerNombreTorneo(torneoId: number): string {
    const torneo = this.torneos.find(t => t.id === torneoId);
    return torneo ? torneo.nombre : 'Torneo desconocido';
  }

  abrirModal() {
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.cargarPollasDelUsuario();  // Recarga las pollas después de cerrar el modal
  }

  // 🔥 Navegar a la pantalla de pronósticos con el ID de la polla seleccionada
  irAPronosticos(polla: Polla) {
    this.router.navigate(['/pronosticos', polla.id]);
  }

  irAPosiciones() {
    this.router.navigate(['/posiciones']);
  }

  irAAdministrar() {
    this.router.navigate(['/administrar']);
  }


}
