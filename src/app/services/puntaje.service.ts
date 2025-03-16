import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user.model'; // Asegúrate de importar el modelo

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

  // 🔥 Nuevo método para actualizar puntaje desde el usuario autenticado
  setPuntajeDesdeUsuario(user: User | null) {
    if (user?.puntaje !== undefined) {
      this.actualizarPuntaje(user.puntaje);
    } else {
      this.actualizarPuntaje(0); // Si no hay puntaje, establecer en 0
    }
  }
}
