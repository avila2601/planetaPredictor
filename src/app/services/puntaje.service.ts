import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PuntajeService {
  private readonly STORAGE_KEY = 'puntajeTotal';
  private readonly API_URL = 'http://localhost:3000/users';

  private puntajeTotalSubject = new BehaviorSubject<number>(0);
  readonly puntajeTotal$ = this.puntajeTotalSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializePuntaje();
  }

  private initializePuntaje(): void {
    try {
      const puntajeGuardado = localStorage.getItem(this.STORAGE_KEY);
      if (puntajeGuardado) {
        const puntaje = JSON.parse(puntajeGuardado);
        this.puntajeTotalSubject.next(Number(puntaje));
        console.log('✅ Puntaje inicial cargado:', puntaje);
      }
    } catch (error) {
      console.error('❌ Error cargando puntaje inicial:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  actualizarPuntaje(nuevoPuntaje: number): void {
    try {
      if (nuevoPuntaje < 0) throw new Error('El puntaje no puede ser negativo');

      this.puntajeTotalSubject.next(nuevoPuntaje);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nuevoPuntaje));
      console.log('✅ Puntaje actualizado:', nuevoPuntaje);
    } catch (error) {
      console.error('❌ Error actualizando puntaje:', error);
    }
  }

  obtenerPuntaje(): number {
    return this.puntajeTotalSubject.value;
  }

  setPuntajeDesdeUsuario(user: User | null): void {
    if (!user) {
      console.warn('⚠️ Usuario no proporcionado, estableciendo puntaje a 0');
      this.actualizarPuntaje(0);
      return;
    }

    const puntaje = user.puntaje ?? 0;
    this.actualizarPuntaje(puntaje);
    console.log('👤 Puntaje actualizado desde usuario:', { userId: user.id, puntaje });
  }

  actualizarPuntajeEnDB(userId: number, nuevoPuntaje: number): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/${userId}`, { puntaje: nuevoPuntaje }).pipe(
      tap({
        next: (user) => {
          this.actualizarPuntaje(user.puntaje);
          console.log('✅ Puntaje actualizado en DB:', { userId, puntaje: user.puntaje });
        },
        error: (error) => console.error('❌ Error actualizando puntaje en DB:', error)
      })
    );
  }

  resetPuntaje(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.puntajeTotalSubject.next(0);
      console.log('🔄 Puntaje reseteado');
    } catch (error) {
      console.error('❌ Error reseteando puntaje:', error);
    }
  }
}
