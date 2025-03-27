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
  pageSize = 30;
  currentPage = 1;
  pages: number[] = [];

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

  get paginatedMatches(): Match[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.matches.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      window.scrollTo(0, 0); // Scroll to top when changing page
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.matches.length / this.pageSize);
  }

  updatePagesArray(): void {
    this.pages = Array.from({length: this.getTotalPages()}, (_, i) => i + 1);
  }

  private initializeComponent(): void {
    this.authService.user$
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

    const pollaId = this.route.snapshot.paramMap.get('id');
    if (!pollaId) return;

    this.matchService.getPredictionsByUser(this.userId, pollaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (predictions) => {
          console.log('📊 Cargando predicciones:', predictions);
          this.updateMatchesWithPredictions(predictions);
          this.calcularPuntajeTotal();
          this.updatePagesArray(); // Add this line
        },
        error: (error) => console.error("❌ Error cargando predicciones:", error)
      });
}

private updateMatchesWithPredictions(predictions: Prediction[]): void {
    this.matches = this.matches.map(match => {
      const prediction = predictions.find(p =>
        p.matchId.toString() === match.matchID.toString()
      );

      if (prediction) {
        console.log(`📝 Actualizando match ${match.matchID} con predicción:`, prediction);
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

  private shouldDeletePrediction(match: Match): boolean {
    return match.pronosticoLocal === null && match.pronosticoVisitante === null;
}

  guardarPronostico(match: Match): void {
    if (this.isSaving || !this.userId) return;

    this.isSaving = true;
    const pollaId = this.route.snapshot.paramMap.get('id');
    if (!pollaId) {
        console.warn('⚠️ No se encontró ID de polla');
        return;
    }

    if (this.shouldDeletePrediction(match)) {
        this.deletePrediction(match, pollaId);
        return;
    }

    this.saveOrUpdatePrediction(match, pollaId);
}

private deletePrediction(match: Match, pollaId: string): void {
  this.matchService.deleteMatchPrediction(match.matchID.toString(), pollaId)
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

private saveOrUpdatePrediction(match: Match, pollaId: string): void {
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

    const pollaId = this.route.snapshot.paramMap.get('id');
    if (!pollaId) {
      console.error('❌ No se encontró ID de polla');
      return;
    }

    this.isSaving = true;
    console.log('💾 Iniciando procesamiento masivo de pronósticos...');

    // Separate matches into those to save and those to delete
    const matchesParaGuardar = this.matches.filter(match =>
      match.pronosticoLocal !== null &&
      match.pronosticoVisitante !== null
    );

    const matchesParaBorrar = this.matches.filter(match =>
      match.pronosticoGuardado && // Has a saved prediction
      match.pronosticoLocal === null &&
      match.pronosticoVisitante === null // Both fields cleared
    );

    console.log('📝 Matches a guardar:', matchesParaGuardar.length);
    console.log('🗑️ Matches a borrar:', matchesParaBorrar.length);

    // Create operations arrays
    const saveOperations = matchesParaGuardar.map(match =>
      this.matchService.saveOrUpdatePrediction(match, this.userId!, pollaId).pipe(
        tap(prediction => {
          const matchToUpdate = this.matches.find(m => m.matchID.toString() === prediction.matchId);
          if (matchToUpdate) {
            matchToUpdate.pronosticoGuardado = prediction.pronosticoGuardado;
            matchToUpdate.puntos = prediction.puntos;
            console.log(`✅ Match ${prediction.matchId} guardado:`, prediction);
          }
        })
      )
    );

    const deleteOperations = matchesParaBorrar.map(match =>
      this.matchService.deleteMatchPrediction(match.matchID.toString(), pollaId).pipe(
        tap(() => {
          const matchToUpdate = this.matches.find(m => m.matchID === match.matchID);
          if (matchToUpdate) {
            matchToUpdate.pronosticoGuardado = '';
            matchToUpdate.puntos = 0;
            console.log(`🗑️ Match ${match.matchID} eliminado`);
          }
        })
      )
    );

    // Combine all operations
    const allOperations = [...saveOperations, ...deleteOperations];

    if (allOperations.length === 0) {
      console.warn('⚠️ No hay cambios para procesar');
      this.isSaving = false;
      return;
    }

    // Execute all operations
    forkJoin(allOperations)
      .pipe(
        take(1),
        finalize(() => {
          this.isSaving = false;
          console.log('🏁 Operación masiva completada');
        })
      )
      .subscribe({
        next: () => {
          console.log('✅ Todos los cambios procesados');
          this.matches = [...this.matches]; // Trigger change detection
          this.calcularPuntajeTotal();
          this.updateUserScore();
        },
        error: (error) => {
          console.error('❌ Error en operación masiva:', error);
          this.isSaving = false;
        }
      });
  }

  // Helper method to update total score
  private updateUserScore(): void {
    const pollaId = this.route.snapshot.paramMap.get('id');
    if (!pollaId || !this.userId) return;

    this.puntajeService.actualizarPuntaje(pollaId, this.userId, this.puntajeTotal)
      .pipe(take(1))
      .subscribe({
        next: (puntaje) => {
          console.log('✅ Puntaje total actualizado:', puntaje);
        },
        error: (error) => {
          console.error('❌ Error actualizando puntaje total:', error);
        }
      });
  }

  guardarYProcesar(match: Match): void {
    if (this.isSaving || !this.userId) {
        return;
    }

    const pollaId = (this.route.snapshot.paramMap.get('id'));
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
