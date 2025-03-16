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
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PuntajeService } from '../../services/puntaje.service';


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
    private puntajeService: PuntajeService
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

  guardarPronostico(match: Match) {
    if (this.userId === null) {
      console.error("❌ No se puede guardar el pronóstico: usuario no autenticado");
      return;
    }

    console.log('Intentando guardar pronóstico para:', match);

    if (match.pronosticoLocal === null || match.pronosticoVisitante === null) {
      match.pronosticoGuardado = '';
      console.log('❌ Pronóstico inválido, se cancela el guardado.');
      return;
    }

    match.pronosticoGuardado = `${match.pronosticoLocal} - ${match.pronosticoVisitante}`;
    const resultado = this.obtenerResultadoFinal(match);
    if (!resultado) return;

    const [resLocal, resVisitante] = resultado.split(' - ').map(Number);
    let puntos = 0;

    if (
      (match.pronosticoLocal > match.pronosticoVisitante && resLocal > resVisitante) ||
      (match.pronosticoLocal < match.pronosticoVisitante && resLocal < resVisitante) ||
      (match.pronosticoLocal === match.pronosticoVisitante && resLocal === resVisitante)
    ) {
      puntos += 5;
      if ((match.pronosticoLocal - match.pronosticoVisitante) === (resLocal - resVisitante)) {
        puntos += 1;
      }
    }
    if (match.pronosticoLocal === resLocal) puntos += 2;
    if (match.pronosticoVisitante === resVisitante) puntos += 2;

    match.puntos = puntos;

    const prediction: Prediction = {
      id: Date.now(),
      userId: this.userId,
      matchId: match.matchID,
      equipoLocal: match.team1.teamName,
      equipoVisitante: match.team2.teamName,
      horario: match.matchDateTimeUTC,
      pronosticoLocal: match.pronosticoLocal,
      pronosticoVisitante: match.pronosticoVisitante,
      pronosticoGuardado: match.pronosticoGuardado,
      resultadoFinal: resultado,
      puntos: puntos,
    };

    console.log('🔄 Guardando predicción:', prediction);

    this.matchService.getPredictionsByUser(this.userId).subscribe((predictions) => {
      console.log('🔍 Comparando con predicciones existentes:', predictions);

      const existingPrediction = predictions.find((p) => p.matchId === match.matchID);
      if (existingPrediction) {
        console.log('✏️ Actualizando predicción existente:', existingPrediction);
        this.matchService.updatePrediction(existingPrediction.id, prediction).subscribe();
      } else {
        console.log('🆕 Guardando nueva predicción:', prediction);
        this.matchService.savePrediction(prediction).subscribe();
      }
    });
    this.calcularPuntajeTotal();
  }

  guardarTodos() {
    console.log('💾 Guardando todos los pronósticos...');
    this.matches.forEach((match) => {
      this.guardarPronostico(match);
      this.calcularPuntajeTotal();
    });
  }

  calcularPuntajeTotal() {
    this.puntajeTotal = this.matches.reduce((total, match) => total + (match.puntos || 0), 0);
    localStorage.setItem('puntajeTotal', JSON.stringify(this.puntajeTotal));
    this.puntajeService.actualizarPuntaje(this.puntajeTotal);
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

  regresar() {
    this.router.navigate(['/grupos-activos']);
  }
}
