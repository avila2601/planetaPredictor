import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, switchMap, catchError, filter, take } from 'rxjs/operators';
import { User } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/users';
  private readonly USER_KEY = 'currentUser';
  private authStatus = new BehaviorSubject<User | null>(this.getStoredUser());
  private authInitialized = new BehaviorSubject<boolean>(false);

  user$ = this.authStatus.asObservable();
  isAuthenticated$ = this.user$.pipe(map(user => !!user));
  isInitialized$ = this.authInitialized.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    console.log('🔄 Initializing AuthService');
    this.initializeAuthState();
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private initializeAuthState(): void {
    const storedUser = this.getStoredUser();
    console.log('📝 Checking stored auth state:', storedUser?.username);

    if (storedUser?.id) {
      this.http.get<User>(`${this.API_URL}/${storedUser.id}`).subscribe({
        next: (user) => {
          if (user) {
            console.log('✅ User session restored:', user.username);
            this.updateAuthState(user);
          } else {
            console.log('⚠️ Stored user not found in DB');
            this.clearAuthState();
          }
          this.authInitialized.next(true);
        },
        error: () => {
          console.error('❌ Error verifying stored user');
          this.clearAuthState();
          this.authInitialized.next(true);
        }
      });
    } else {
      console.log('⚠️ No stored user found');
      this.clearAuthState();
      this.authInitialized.next(true);
    }
  }

  waitForAuthInit(): Observable<boolean> {
    return this.isInitialized$.pipe(
      filter(initialized => initialized),
      take(1)
    );
  }

  login(username: string, password: string): Observable<boolean> {
    username = username.trim().toLowerCase();
    console.log('🔑 Attempting login:', username);

    return this.http.get<User[]>(`${this.API_URL}?username=${username}`).pipe(
      map(users => {
        const user = users.find(u => u.password === password);

        if (user) {
          console.log('✅ Login successful:', user.username);
          this.updateAuthState(user);
          return true;
        }

        console.log('❌ Login failed');
        return false;
      })
    );
  }

  private updateAuthState(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.authStatus.next(user);
  }

  logout(): void {
    console.log('🔄 Logging out user:', this.authStatus.getValue()?.username);
    this.clearAuthState();
    this.router.navigate(['/inicio']);
  }

  private clearAuthState(): void {
    console.log('🧹 Clearing auth state');
    localStorage.removeItem(this.USER_KEY);
    this.authStatus.next(null);
  }

  registrar(username: string, email: string, password: string): Observable<string> {
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    return this.http.get<User[]>(`${this.API_URL}?username=${username}`).pipe(
      switchMap(usersByUsername => {
        if (usersByUsername.length > 0) {
          return of('El usuario ya existe');
        }

        return this.http.get<User[]>(`${this.API_URL}?email=${email}`).pipe(
          switchMap(usersByEmail => {
            if (usersByEmail.length > 0) {
              return of('La dirección de correo ingresada ya se encuentra registrada');
            }

            const newUser: User = {
              id: Date.now().toString(),
              username,
              email,
              password,
              pollas: [],
              puntaje: 0
            };

            return this.http.post<User>(this.API_URL, newUser).pipe(
              map(() => 'El usuario se ha creado satisfactoriamente')
            );
          })
        );
      })
    );
  }

  updateUser(user: User): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/${user.id}`, user).pipe(
      tap(updatedUser => {
        if (updatedUser.id === this.authStatus.getValue()?.id) {
          this.updateAuthState(updatedUser);
        }
      })
    );
  }

  getUserById(userId: string): Observable<User | null> {
    return this.http.get<User>(`${this.API_URL}/${userId}`).pipe(
      catchError(() => of(null))
    );
  }

  getCurrentUserId(): string | null {
    return this.authStatus.getValue()?.id || null;
  }

  actualizarPuntajeUsuario(userId: string, nuevoPuntaje: number): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/${userId}`, { puntaje: nuevoPuntaje }).pipe(
      tap(user => {
        if (user.id === this.authStatus.getValue()?.id) {
          this.updateAuthState(user);
        }
      })
    );
  }

  enviarRecuperacion(email: string): Observable<boolean> {
    return this.http.get<User[]>(`${this.API_URL}?email=${email.toLowerCase()}`).pipe(
      map(users => users.length > 0)
    );
  }
}
