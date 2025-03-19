import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  apiUrl = 'http://localhost:3000/users';
  private authStatus = new BehaviorSubject<User | null>(null);
  user$ = this.authStatus.asObservable();
  isAuthenticated$ = this.user$.pipe(map(user => !!user)); // 🔥 Verifica si hay usuario autenticado


  constructor(private http: HttpClient) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.getLoggedUser().subscribe();
    }
  }

  setLoggedUser(user: User | null) {
    this.authStatus.next(user);
    if (user) {
      localStorage.setItem('userId', user.id.toString());
    } else {
      localStorage.removeItem('userId');
    }
  }

  login(username: string, password: string): Observable<User | null> {
    username = username.trim().toLowerCase();

    return this.http.get<User[]>(`${this.apiUrl}?username=${username}`).pipe(
      map(users => users.find(u => u.password === password) || null),
      tap(user => {
    console.log(user, 'ateneaa')

        if (user?.id) {
          this.setLoggedUser(user);
        }
      })
    );
  }

  logout() {
    this.setLoggedUser(null);
  }

  getLoggedUser(): Observable<User | null> {
    const userId = localStorage.getItem('userId');

    if (!userId) return of(null);

    return this.http.get<User>(`${this.apiUrl}/${userId}`).pipe(
      tap(user => this.setLoggedUser(user)),
      switchMap(() => this.user$)
    );
  }

  registrar(username: string, email: string, password: string): Observable<string> {
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    return this.http.get<User[]>(`${this.apiUrl}?username=${username}`).pipe(
      switchMap(usersByUsername => {
        if (usersByUsername.length > 0) {
          return of('El usuario ya existe');
        }

        return this.http.get<User[]>(`${this.apiUrl}?email=${email}`).pipe(
          switchMap(usersByEmail => {
            if (usersByEmail.length > 0) {
              return of('La dirección de correo ingresada ya se encuentra registrada');
            }

            const newUser: User = {
              id: Date.now(),
              username,
              email,
              password,
              pollas: [],
              puntaje: 0 // 🔹 Asegurar que el usuario tiene puntaje inicial
            };

            return this.http.post<User>(this.apiUrl, newUser).pipe(
              map(() => 'El usuario se ha creado satisfactoriamente')
            );
          })
        );
      })
    );
  }

  enviarRecuperacion(email: string): Observable<boolean> {
    return this.http.get<User[]>(`${this.apiUrl}?email=${email.toLowerCase()}`).pipe(
      map(users => {
        if (users.length > 0) {
          console.log(`🔗 Se ha enviado un enlace de recuperación a ${email}`);
          return true;
        }
        return false;
      })
    );
  }

  actualizarPuntajeUsuario(userId: number, nuevoPuntaje: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}`, { puntaje: nuevoPuntaje }).pipe(
      tap(user => this.authStatus.next(user)) // 🔹 Actualiza el estado global del usuario
    );
  }

  updateUser(user: User): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${user.id}`, user).pipe(
      tap(updatedUser => {
        this.setLoggedUser(updatedUser);
        console.log('✅ Usuario actualizado:', updatedUser);
      })
    );
  }

  getUserById(userId: number): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`).pipe(
        catchError(() => of(null))
    );
}

getCurrentUserId(): number | null {
  return this.authStatus.getValue()?.id || null;  // Changed from userSubject to authStatus
}

}
