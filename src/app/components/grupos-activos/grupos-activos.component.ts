import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PuntajeService } from '../../services/puntaje.service';
import { PollaService } from '../../services/polla.service';
import { Polla } from '../../models/polla.model';
import { User } from '../../models/user.model';
import { CrearPollaComponent } from '../crear-polla/crearpolla.component';
import { PronosticosComponent } from '../pronosticos/pronosticos.component';
import { PosicionesComponent } from '../posiciones/posiciones.component';
import { Router } from '@angular/router';


@Component({
  selector: 'app-grupos-activos',
  standalone: true,
  imports: [CommonModule, RouterModule, CrearPollaComponent, PronosticosComponent, PosicionesComponent],
  templateUrl: './grupos-activos.component.html',
  styleUrls: ['./grupos-activos.component.scss']
})

export class GruposActivosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  pollas$: Observable<Polla[]>;
  puntajeTotal$: Observable<number>;
  user$: Observable<User | null>;
  modalAbierto = false;
  mostrarPronostico = false;
  mostrarPosiciones = false;

  constructor(
    private authService: AuthService,
    private puntajeService: PuntajeService,
    private pollaService: PollaService,
    private router: Router
  ) {
    this.pollas$ = this.pollaService.getPollasByUser$;
    this.puntajeTotal$ = this.puntajeService.puntajeTotal$;
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.cargarPollasUsuario(user.id);
        this.puntajeService.setPuntajeDesdeUsuario(user);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarPollasUsuario(userId: number): void {
    this.pollaService.cargarPollasPorUsuario(userId);
  }

  irAPronosticos(polla: Polla): void {
    this.pollaService.setPollaSeleccionada(polla);
    this.router.navigate(['/pronosticos', polla.id]);
  }

  irAPosiciones(polla: Polla): void {
    this.pollaService.setPollaSeleccionada(polla);
    this.router.navigate(['/posiciones', polla.id]);
  }

  irAAdministrar(): void {
    // Implementar lógica de administración
  }

  obtenerPosicion(polla: Polla): number {
    return this.pollaService.calcularPosicionUsuario(polla);
  }

  abrirModal(): void {
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  cargarPollasDelUsuario(): void {
    this.authService.user$.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.cargarPollasUsuario(user.id);
      }
    });
  }
}
