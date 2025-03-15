import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/users';
  private authStatus = new BehaviorSubject<User | null>(null);
  user$ = this.authStatus.asObservable();
  isAuthenticated$ = this.user$.pipe(map(user => !!user)); // 🔥 Verifica si hay usuario autenticado

  constructor(private http: HttpClient) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.getLoggedUser().subscribe();
    }
  }

  login(username: string, password: string): Observable<User | null> {
    username = username.trim().toLowerCase();

    return this.http.get<User[]>(`${this.apiUrl}?username=${username}`).pipe(
      map(users => {
        const user = users.find(u => u.password === password) || null;
        if (user?.id) { // 🔹 Verifica que `user` y `id` existen antes de guardarlo
          localStorage.setItem('userId', user.id.toString());
        }
        return user;
      }),
      tap(user => this.authStatus.next(user))
    );
  }

  logout() {
    this.authStatus.next(null);
    localStorage.removeItem('userId');
  }

  getLoggedUser(): Observable<User | null> {
    const userId = localStorage.getItem('userId');

    if (!userId) return of(null);

    return this.http.get<User>(`${this.apiUrl}/${userId}`).pipe(
      tap(user => this.authStatus.next(user))
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
              id: Date.now(), // ✅ Genera un ID único en frontend
              username,
              email,
              password,
              pollas: []
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
}
