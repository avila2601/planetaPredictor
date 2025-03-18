import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { Match } from '../../models/match.model';
import { Prediction } from '../../models/prediction.model';
import { AuthService } from '../../services/auth.service';
import { PollaService } from '../../services/polla.service';
import { Polla } from '../../models/polla.model';
import { Observable, take } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PuntajeService } from '../../services/puntaje.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-pronosticos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pronosticos.component.html',
  styleUrls: ['./pronosticos.component.scss'],
})
export class PronosticosComponent implements OnInit {
  matches: Match[] = [];
  puntajeTotal: number = 0;
  userId: number | null = null;
  pollaSeleccionada$: Observable<Polla | null>;

  constructor(
    private matchService: MatchService,
    private router: Router,
    private authService: AuthService,
    private pollaService: PollaService,
    private route: ActivatedRoute,
    private puntajeService: PuntajeService,
    private http: HttpClient
  ) {
    this.pollaSeleccionada$ = this.pollaService.pollaSeleccionada$;
  }

  ngOnInit() {
    this.authService.getLoggedUser().subscribe(user => {
      if (user?.id !== undefined) {
        this.userId = user.id;
        console.log("👤 Usuario autenticado con ID:", this.userId);

        // Obtener el ID de la polla desde la URL
        this.route.paramMap.subscribe(params => {
          const pollaId = params.get('id');
          if (pollaId) {
            this.pollaService.getPollaById(pollaId).subscribe(polla => {
              if (polla) {
                console.log("📌 Polla seleccionada:", polla.name);
                this.pollaService.setPollaSeleccionada(polla);
                this.obtenerMatches(polla);
              } else {
                console.warn("⚠️ No se encontró la polla con ID:", pollaId);
              }
            });
          } else {
            console.log("🌍 URL actual:", this.route.snapshot.paramMap.get('id'));
            console.warn("⚠️ No hay ID de polla en la URL.");
          }
        });

      } else {
        console.warn("⚠️ No hay usuario autenticado o el usuario no tiene ID.");
        this.userId = null;
      }
    });
  }

  obtenerMatches(polla: Polla) {
    console.log(`📌 Cargando partidos para la polla: ${polla.name}`);

    this.matchService.getMatchesByPolla(polla).subscribe((data) => {
      this.matches = data.map(match => ({
        ...match,
        matchDateTime: new Date(match.matchDateTimeUTC),
        pronosticoLocal: null,
        pronosticoVisitante: null,
        pronosticoGuardado: '',
        puntos: 0
      }));

      console.log('📌 Matches obtenidos:', this.matches);
      this.cargarPronosticosDesdeDB();
      this.cargarPronosticosGuardados();
      this.calcularPuntajeTotal();
    }, (error) => {
      console.error("❌ Error al obtener los partidos:", error);
    });
  }

  cargarPronosticosDesdeDB() {
    if (this.userId === null) return;

    console.log('Cargando predicciones para userId:', this.userId);

    this.matchService.getPredictionsByUser(this.userId).subscribe((predictions) => {
      console.log('Predicciones obtenidas desde la DB:', predictions);

      this.matches.forEach((match) => {
        const prediction = predictions.find((p) => Number(p.matchId) === Number(match.matchID));
        if (prediction) {
          match.pronosticoLocal = prediction.pronosticoLocal;
          match.pronosticoVisitante = prediction.pronosticoVisitante;
          match.pronosticoGuardado = prediction.pronosticoGuardado;
          match.puntos = prediction.puntos;
        }
      });

      console.log('🎯 Matches después de asignar predicciones:', this.matches);

      this.calcularPuntajeTotal();
    });
  }

  obtenerResultadoFinal(match: Match): string {
    const resultado = match.matchResults.find(res => res.resultTypeID === 2);
    return resultado ? `${resultado.pointsTeam1} - ${resultado.pointsTeam2}` : '-';
  }

  isSaving = false;

  guardarPronostico(match: Match) {
    if (this.isSaving) return;
    this.isSaving = true;

    if (this.userId === null) {
        console.error("❌ No se puede guardar el pronóstico: usuario no autenticado");
        this.isSaving = false;
        return;
    }

    // Si ambos pronósticos son nulos o vacíos, eliminar la predicción
    if (match.pronosticoLocal === null && match.pronosticoVisitante === null) {
        this.matchService.getPredictionsByUser(this.userId).pipe(take(1)).subscribe((predictions) => {
            const existingPrediction = predictions.find((p) => p.matchId === match.matchID);

            if (existingPrediction) {
                // Eliminar la predicción existente
                this.http.delete(`${this.matchService.predictionsUrl}/${existingPrediction.id}`).subscribe({
                    next: () => {
                        match.pronosticoGuardado = '';
                        match.puntos = 0;
                        this.calcularYActualizarPuntaje();
                        this.isSaving = false;
                        console.log("✅ Predicción eliminada correctamente");
                    },
                    error: (error) => {
                        console.error("❌ Error al eliminar predicción:", error);
                        this.isSaving = false;
                    }
                });
            } else {
                this.isSaving = false;
            }
        });
        return;
    }

    // Continuar con el código existente para guardar/actualizar predicciones
    this.matchService.getPredictionsByUser(this.userId).pipe(take(1)).subscribe((predictions) => {
        // ... resto del código para guardar/actualizar ...
    });
}

  calcularYActualizarPuntaje() {
    this.calcularPuntajeTotal(); // Ya incluye la actualización
}



  guardarTodos() {
    console.log('💾 Guardando todos los pronósticos...');
    this.matches.forEach((match) => {
      this.guardarPronostico(match);
      this.calcularPuntajeTotal();
    });
  }

  calcularPuntajeTotal(): number {
    const nuevoPuntaje = this.matches.reduce((total, match) => total + (match.puntos || 0), 0);

    // Solo actualiza si el puntaje cambió
    if (nuevoPuntaje === this.puntajeTotal) {
      return this.puntajeTotal;
    }

    this.puntajeTotal = nuevoPuntaje;

    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        const updatedUser = { ...user, puntaje: this.puntajeTotal };

        // 🔥 Actualizar en db.json
        this.http.put(`http://localhost:3000/users/${user.id}`, updatedUser).subscribe(() => {
          console.log("✅ Puntaje actualizado en db.json:", this.puntajeTotal);
        });

        // 🔥 Guardar localmente
        localStorage.setItem('puntajeTotal', JSON.stringify(this.puntajeTotal));
        this.puntajeService.actualizarPuntaje(this.puntajeTotal);
      }
    });

    return this.puntajeTotal;
  }


  cargarPronosticosGuardados() {
    const pronosticosGuardados = localStorage.getItem('matches');
    if (pronosticosGuardados) {
      this.matches = JSON.parse(pronosticosGuardados);
    }
    const puntajeGuardado = localStorage.getItem('puntajeTotal');
    if (puntajeGuardado) {
      this.puntajeTotal = JSON.parse(puntajeGuardado);
    }
  }

  actualizarPuntaje(nuevoPuntaje: number) {
    this.authService.user$.pipe(take(1)).subscribe(user => { // ⬅️ Asegura que solo se ejecuta una vez
      if (user) {
        const puntajeActualizado = user.puntaje + nuevoPuntaje;

        this.authService.actualizarPuntajeUsuario(user.id, puntajeActualizado).subscribe(usuarioActualizado => {
          console.log("✅ Puntaje actualizado en db.json:", usuarioActualizado.puntaje);
        });
      }
    });
  }

  procesarPronosticos() {
    const puntosGanados = this.calcularPuntajeTotal();

    if (puntosGanados !== 0) { // ⬅️ Evita actualizar si no hay cambios
      this.actualizarPuntaje(puntosGanados);
      console.log("✅ Pronósticos procesados, puntaje total:", puntosGanados);
    }
  }

  regresar() {
    this.router.navigate(['/grupos-activos']);
  }

  guardarYProcesar(match: Match) {
    this.guardarPronostico(match);
    this.procesarPronosticos();
  }

}
