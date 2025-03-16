import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PuntajeService {
  private puntajeTotalSubject = new BehaviorSubject<number>(0);
  puntajeTotal$ = this.puntajeTotalSubject.asObservable();

  constructor() {
    const puntajeGuardado = localStorage.getItem('puntajeTotal');
    if (puntajeGuardado) {
      this.puntajeTotalSubject.next(JSON.parse(puntajeGuardado));
    }
  }

  actualizarPuntaje(nuevoPuntaje: number) {
    this.puntajeTotalSubject.next(nuevoPuntaje);
    localStorage.setItem('puntajeTotal', JSON.stringify(nuevoPuntaje));
  }

  obtenerPuntaje(): number {
    return this.puntajeTotalSubject.value;
  }
}
