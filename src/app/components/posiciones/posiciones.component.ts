import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PollaService } from '../../services/polla.service';
import { AuthService } from '../../services/auth.service';
import { PuntajeService } from '../../services/puntaje.service';
import { Ranking } from '../../models/ranking.model';

@Component({
  selector: 'app-posiciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './posiciones.component.html',
  styleUrls: ['./posiciones.component.scss']
})
export class PosicionesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  rankings: Ranking[] = [];
  loading = false;
  currentUserId: string | null = null;
  pollaId: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pollaService: PollaService,
    private authService: AuthService,
    private puntajeService: PuntajeService
  ) {}

  ngOnInit(): void {
    this.pollaId = this.route.snapshot.paramMap.get('id');
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUserId = user?.id || null;
      if (this.pollaId) {
        this.cargarPosiciones();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarPosiciones(): void {
    if (!this.pollaId) return;

    this.loading = true;
    this.pollaService.getPollaById(this.pollaId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: polla => {
        if (!polla?.participants) return;

        this.puntajeService.obtenerPuntajesPorPolla(this.pollaId!).pipe(
          takeUntil(this.destroy$)
        ).subscribe(puntajes => {
          Promise.all(polla.participants.map(userId =>
            this.authService.getUserById(userId).toPromise()
          )).then(users => {
            this.rankings = users
              .filter(user => user !== null)
              .map(user => ({
                id: `${this.pollaId}_${user!.id}`,
                userId: user!.id,
                username: user!.username,
                pollaId: this.pollaId!,
                puntaje: puntajes.find(p => p.userId === user!.id)?.puntajeTotal || 0
              }))
              .sort((a, b) => b.puntaje - a.puntaje);

            this.loading = false;
          });
        });
      },
      error: error => {
        console.error('Error cargando posiciones:', error);
        this.loading = false;
      }
    });
  }

  regresar() {
    this.router.navigate(['/grupos-activos']);
  }
}
