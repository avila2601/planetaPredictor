import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin, Observable, Subject } from 'rxjs';
import { finalize, take, takeUntil, tap } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { AuthService } from '../../services/auth.service';
import { PollaService } from '../../services/polla.service';
import { PuntajeService } from '../../services/puntaje.service';
import { Match } from '../../models/match.model';
import { Polla } from '../../models/polla.model';
import { Prediction } from '../../models/prediction.model';

@Component({
  selector: 'app-pronosticos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pronosticos.component.html',
  styleUrls: ['./pronosticos.component.scss']
})
export class PronosticosComponent implements OnInit, OnDestroy {
  matches: Match[] = [];
  puntajeTotal: number = 0;
  userId: string | null = null;
  pollaSeleccionada$: Observable<Polla | null>;
  isSaving = false;

  private destroy$ = new Subject<void>();

  constructor(
    private matchService: MatchService,
    private router: Router,
    private authService: AuthService,
    private pollaService: PollaService,
    private route: ActivatedRoute,
    private puntajeService: PuntajeService
  ) {
    this.pollaSeleccionada$ = this.pollaService.pollaSeleccionada$;
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.authService.getLoggedUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (!user?.id) {
            console.warn("⚠️ No hay usuario autenticado");
            return;
          }

          this.userId = user.id;
          console.log("👤 Usuario autenticado con ID:", this.userId);
          this.loadPollaFromUrl();
        },
        error: (error) => console.error("❌ Error obteniendo usuario:", error)
      });
  }

  private loadPollaFromUrl(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (params) => {
          const pollaId = params.get('id');
          if (!pollaId) {
            console.warn("⚠️ No hay ID de polla en la URL");
            return;
          }

          this.loadPollaById(pollaId);
        }
      });
  }

  private loadPollaById(pollaId: string): void {
    this.pollaService.getPollaById(pollaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (polla) => {
          if (!polla) {
            console.warn("⚠️ No se encontró la polla:", pollaId);
            return;
          }

          this.pollaService.setPollaSeleccionada(polla);
          this.obtenerMatches(polla);
        },
        error: (error) => console.error("❌ Error cargando polla:", error)
      });
  }

  obtenerMatches(polla: Polla): void {
    this.matchService.getMatchesByPolla(polla)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (matches) => {
          this.matches = this.initializeMatches(matches);
          this.loadPredictions();
        },
        error: (error) => console.error("❌ Error obteniendo partidos:", error)
      });
  }

  private initializeMatches(matches: Match[]): Match[] {
    return matches.map(match => ({
      ...match,
      matchDateTime: new Date(match.matchDateTimeUTC),
      pronosticoLocal: null,
      pronosticoVisitante: null,
      pronosticoGuardado: '',
      puntos: 0
    }));
  }

  private loadPredictions(): void {
    if (!this.userId) return;

    this.matchService.getPredictionsByUser(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (predictions) => {
          this.updateMatchesWithPredictions(predictions);
          this.calcularPuntajeTotal();
        },
        error: (error) => console.error("❌ Error cargando predicciones:", error)
      });
  }

  private updateMatchesWithPredictions(predictions: Prediction[]): void {
    this.matches = this.matches.map(match => {
      const prediction = predictions.find(p => Number(p.matchId) === Number(match.matchID));
      if (prediction) {
        return {
          ...match,
          pronosticoLocal: prediction.pronosticoLocal,
          pronosticoVisitante: prediction.pronosticoVisitante,
          pronosticoGuardado: prediction.pronosticoGuardado,
          puntos: prediction.puntos
        };
      }
      return match;
    });
  }

  guardarPronostico(match: Match): void {
    if (this.isSaving || !this.userId) return;

    this.isSaving = true;
    const pollaId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.shouldDeletePrediction(match)) {
      this.deletePrediction(match, pollaId);
      return;
    }

    this.saveOrUpdatePrediction(match, pollaId);
  }

  private shouldDeletePrediction(match: Match): boolean {
    return match.pronosticoLocal === null && match.pronosticoVisitante === null;
}

  private deletePrediction(match: Match, pollaId: number): void {
    this.matchService.deleteMatchPrediction(match.matchID, pollaId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.handlePredictionDeleted(match);
        },
        error: (error) => {
          console.error("❌ Error eliminando predicción:", error);
          this.isSaving = false;
        }
      });
  }

  private saveOrUpdatePrediction(match: Match, pollaId: number): void {
    this.matchService.saveOrUpdatePrediction(match, this.userId!, pollaId)
      .pipe(take(1))
      .subscribe({
        next: (savedPrediction) => {
          this.handlePredictionSaved(match, savedPrediction);
        },
        error: (error) => {
          console.error("❌ Error guardando predicción:", error);
          this.isSaving = false;
        }
      });
  }

  private handlePredictionDeleted(match: Match): void {
    match.pronosticoGuardado = '';
    match.puntos = 0;
    this.updateUIAfterPrediction();
  }

  guardarTodos(): void {
    if (this.isSaving || !this.userId) {
        console.warn('⚠️ No se puede guardar: operación en curso o usuario no autenticado');
        return;
    }

    const pollaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!pollaId) {
        console.error('❌ No se encontró ID de polla');
        return;
    }

    this.isSaving = true;
    console.log('💾 Guardando todos los pronósticos...');

    // Filter matches that have both predictions
    const matchesConPronostico = this.matches.filter(match =>
        match.pronosticoLocal !== null &&
        match.pronosticoVisitante !== null
    );

    // Create an array of observables for each prediction
    const saveOperations = matchesConPronostico.map(match =>
        this.matchService.saveOrUpdatePrediction(match, this.userId!, pollaId)
    );

    // Execute all save operations
    forkJoin(saveOperations)
        .pipe(
            take(1),
            finalize(() => {
                this.isSaving = false;
                console.log('✅ Operación completada');
            })
        )
        .subscribe({
            next: (results) => {
                console.log('✅ Todos los pronósticos guardados:', results);
                this.calcularPuntajeTotal();
            },
            error: (error) => {
                console.error('❌ Error guardando pronósticos:', error);
                this.isSaving = false;
            }
        });
}

  guardarYProcesar(match: Match): void {
    if (this.isSaving || !this.userId) {
        return;
    }

    const pollaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!pollaId) {
        console.error('❌ No se encontró ID de polla');
        return;
    }

    this.guardarPronostico(match);
    this.calcularPuntajeTotal();
}

  private handlePredictionSaved(match: Match, savedPrediction: Prediction): void {
    Object.assign(match, {
      pronosticoLocal: savedPrediction.pronosticoLocal,
      pronosticoVisitante: savedPrediction.pronosticoVisitante,
      pronosticoGuardado: savedPrediction.pronosticoGuardado,
      puntos: savedPrediction.puntos
    });
    this.updateUIAfterPrediction();
  }

  private updateUIAfterPrediction(): void {
    this.matches = [...this.matches];
    this.calcularPuntajeTotal();
    this.isSaving = false;
  }

  calcularPuntajeTotal(): number {
    const nuevoPuntaje = this.matches.reduce((total, match) => total + (match.puntos || 0), 0);

    if (nuevoPuntaje === this.puntajeTotal) {
      return this.puntajeTotal;
    }

    this.puntajeTotal = nuevoPuntaje;
    this.updateUserScore();
    return this.puntajeTotal;
  }

  private updateUserScore(): void {
    const pollaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!pollaId || !this.userId) return;

    this.puntajeService.actualizarPuntaje(pollaId, this.userId, this.puntajeTotal)
      .pipe(take(1))
      .subscribe({
        next: (puntaje) => {
          console.log('✅ Puntaje guardado:', puntaje);
        },
        error: (error) => {
          console.error('❌ Error guardando puntaje:', error);
        }
      });
  }

  onInputChange(value: any, match: Match, field: 'local' | 'visitante'): void {
    if (value === '') {
        if (field === 'local') {
            match.pronosticoLocal = null;
        } else {
            match.pronosticoVisitante = null;
        }

        // Clear pronosticoGuardado if both fields are empty
        if (match.pronosticoLocal === null && match.pronosticoVisitante === null) {
            match.pronosticoGuardado = '';
        }
    }
}

  regresar(): void {
    this.router.navigate(['/grupos-activos']);
  }
}
