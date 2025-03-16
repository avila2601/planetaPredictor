import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CrearPollaComponent } from '../crear-polla/crearpolla.component';
import { PronosticosComponent } from '../pronosticos/pronosticos.component';
import { PosicionesComponent } from '../posiciones/posiciones.component';
import { PollaService } from '../../services/polla.service';
import { AuthService } from '../../services/auth.service';
import { Polla } from '../../models/polla.model';
import { ChangeDetectorRef } from '@angular/core';
import { PuntajeService } from '../../services/puntaje.service';

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
  puntajeTotal: number | null = null;
  torneos: { id: number; nombre: string }[] = [];
  pollas: Polla[] = [];
  modalAbierto = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private pollaService: PollaService,
    private authService: AuthService,
    private router: Router,
    private puntajeService: PuntajeService
  ) {}

  ngOnInit() {
    this.cargarPollasDelUsuario();

    // 🔥 Escuchar cambios en el usuario autenticado
    this.authService.user$.subscribe(user => {
      if (user) {
        console.log("👤 Usuario autenticado:", user);
        this.puntajeService.setPuntajeDesdeUsuario(user);
        this.cargarPuntajeTotal(); // ✅ Pasa el puntaje directamente
      }
    });

    // 🔥 Escuchar cambios en el puntaje total
    this.puntajeService.puntajeTotal$.subscribe(puntaje => {
      this.puntajeTotal = puntaje;
    });
  }


  private cargarPuntajeTotal() {
  const puntajeGuardado = localStorage.getItem('puntajeTotal');
  this.puntajeTotal = puntajeGuardado ? JSON.parse(puntajeGuardado) : 0; // 🔥 Usa 0 si es null
  this.puntajeService.actualizarPuntaje(this.puntajeTotal ?? 0);
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


  actualizarPuntaje(nuevoPuntaje: number) {
    console.log("📢 Puntaje recibido en el padre:", nuevoPuntaje);
    this.puntajeTotal = nuevoPuntaje;
    this.cdr.detectChanges(); // 🔥 Forzamos la detección de cambios
  }

  logout() {
    localStorage.setItem('puntajeTotal', JSON.stringify(this.puntajeTotal)); // Guardar el puntaje
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}
