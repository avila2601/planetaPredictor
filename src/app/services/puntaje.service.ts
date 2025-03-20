import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, switchMap, take } from 'rxjs/operators';

interface Puntaje {
  id?: string;
  pollaId: string;
  usuarioId: string;
  puntaje: number;
}

@Injectable({
  providedIn: 'root'
})
export class PuntajeService {
  private readonly API_URL = 'http://localhost:3000/puntajes';
  private puntajesPorPollaSubject = new BehaviorSubject<Map<string, number>>(new Map());
  private puntajeTotalSubject = new BehaviorSubject<number>(0);

  readonly puntajesPorPolla$ = this.puntajesPorPollaSubject.asObservable();
  readonly puntajeTotal$ = this.puntajeTotalSubject.asObservable();
  constructor(private http: HttpClient) {}

  // Nuevo método para obtener todos los puntajes de un usuario
  obtenerPuntajesPorUsuario(usuarioId: string): Observable<Puntaje[]> {
    return this.http.get<Puntaje[]>(`${this.API_URL}?usuarioId=${usuarioId}`).pipe(
      tap(puntajes => {
        console.log('📊 Puntajes obtenidos:', puntajes);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo puntajes:', error);
        return of([]);
      })
    );
  }

  // Nuevo método para obtener el puntaje total de todas las pollas de un usuario
  obtenerPuntajeTotal(usuarioId: string): Observable<number> {
    return this.obtenerPuntajesPorUsuario(usuarioId).pipe(
      map(puntajes => puntajes.reduce((total, p) => total + p.puntaje, 0)),
      tap(total => {
        this.puntajeTotalSubject.next(total);
        console.log('💯 Puntaje total calculado:', total);
      })
    );
  }

  actualizarPuntaje(pollaId: string, usuarioId: string, nuevoPuntaje: number): Observable<Puntaje> {
    return this.obtenerPuntajeExistente(pollaId, usuarioId).pipe(
      map(puntajeExistente => {
        if (puntajeExistente) {
          return { ...puntajeExistente, puntaje: nuevoPuntaje };
        } else {
          return {
            id: Date.now().toString(),
            pollaId,
            usuarioId,
            puntaje: nuevoPuntaje
          };
        }
      }),
      switchMap(puntaje => {
        if (puntaje.id) {
          return this.http.patch<Puntaje>(`${this.API_URL}/${puntaje.id}`, puntaje);
        } else {
          return this.http.post<Puntaje>(this.API_URL, puntaje);
        }
      }),
      tap(puntaje => {
        // Actualizar el Map de puntajes por polla
        const puntajesActuales = this.puntajesPorPollaSubject.getValue();
        puntajesActuales.set(puntaje.pollaId, puntaje.puntaje);
        this.puntajesPorPollaSubject.next(puntajesActuales);
        console.log('✅ Puntaje actualizado:', puntaje);
      })
    );
  }

  obtenerPuntaje(pollaId: string, usuarioId: string): Observable<number> {
    return this.obtenerPuntajeExistente(pollaId, usuarioId).pipe(
      tap(puntaje => {
        if (puntaje) {
          this.puntajeTotalSubject.next(puntaje.puntaje);
        }
      }),
      map(puntaje => puntaje?.puntaje || 0)
    );
  }

  private obtenerPuntajeExistente(pollaId: string, usuarioId: string): Observable<Puntaje | null> {
    return this.http.get<Puntaje[]>(`${this.API_URL}?pollaId=${pollaId}&usuarioId=${usuarioId}`).pipe(
      map(puntajes => puntajes[0] || null),
      catchError(error => {
        console.error('❌ Error obteniendo puntaje:', error);
        return of(null);
      })
    );
  }

  // Método para actualizar el puntaje total desde cualquier componente
  setPuntajeTotal(puntaje: number): void {
    this.puntajeTotalSubject.next(puntaje);
  }

  cargarPuntajes(usuarioId: string): void {
    this.obtenerPuntajesPorUsuario(usuarioId).pipe(
      take(1)
    ).subscribe(puntajes => {
      const puntajesMap = new Map<string, number>();
      puntajes.forEach(p => {
        if (p.pollaId) {
          puntajesMap.set(p.pollaId, p.puntaje);
        }
      });
      this.puntajesPorPollaSubject.next(puntajesMap);
    });
  }

}
