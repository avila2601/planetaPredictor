import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PuntajeService } from '../../services/puntaje.service';
import { PollaService } from '../../services/polla.service';
import { Polla } from '../../models/polla.model';
import { User } from '../../models/user.model';
import { CrearPollaComponent } from '../crear-polla/crearpolla.component';
import { PronosticosComponent } from '../pronosticos/pronosticos.component';
import { PosicionesComponent } from '../posiciones/posiciones.component';

@Component({
  selector: 'app-grupos-activos',
  standalone: true,
  imports: [CommonModule, RouterModule, CrearPollaComponent, PronosticosComponent, PosicionesComponent],
  templateUrl: './grupos-activos.component.html',
  styleUrls: ['./grupos-activos.component.scss']
})
export class GruposActivosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private posiciones = new Map<string, number>();
  private puntajesPorPolla = new Map<string, number>();

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
        this.cargarPuntajeUsuario(user.id);
        this.loadPositions();
      }
    });
  }

  private cargarPuntajeUsuario(userId: string): void {
    this.puntajeService.cargarPuntajes(userId);

    this.puntajeService.puntajesPorPolla$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(puntajes => {
      this.puntajesPorPolla = puntajes;
    });
  }

  getPuntajePolla(pollaId: string | undefined): number {
    if (!pollaId) return 0;
    return this.puntajesPorPolla.get(pollaId) || 0;
  }

  cargarPollasUsuario(userId: string): void {
    this.pollaService.cargarPollasPorUsuario(userId);
  }

  obtenerYGuardarPosicion(polla: Polla): void {
    this.pollaService.calcularPosicionUsuario(polla)
      .pipe(takeUntil(this.destroy$))
      .subscribe(position => {
        if (polla.id) {
          this.posiciones.set(polla.id, position);
        }
      });
  }

  getPosicion(pollaId: string | undefined): number {
    if (!pollaId) return 0;
    return this.posiciones.get(pollaId) || 0;
  }

  loadPositions(): void {
    this.pollas$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(pollas => {
      pollas?.forEach(polla => {
        if (polla.id) {
          this.pollaService.calcularPosicionUsuario(polla)
            .pipe(take(1))
            .subscribe(position => {
              this.posiciones.set(polla.id!, position);
            });
        }
      });
    });
  }

  irAPronosticos(polla: Polla): void {
    this.pollaService.setPollaSeleccionada(polla);
    this.router.navigate(['/pronosticos', polla.id]);
  }

  irAPosiciones(polla: Polla): void {
    this.pollaService.setPollaSeleccionada(polla);
    this.router.navigate(['/posiciones', polla.id]);
  }

  irAAdministrar(polla: Polla): void {
    this.pollaService.setPollaSeleccionada(polla);
    this.router.navigate(['/administrar', polla.id]);
  }

  abrirModal(): void {
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  onModalCerrado(): void {
    this.cerrarModal();
    this.authService.user$.pipe(
        take(1)
    ).subscribe(user => {
        if (user?.id) {
            this.cargarPollasUsuario(user.id);
        }
    });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
