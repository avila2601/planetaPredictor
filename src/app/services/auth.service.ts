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
  private apiUrl = 'http://localhost:3000/users';
  private authStatus = new BehaviorSubject<User | null>(null);
  private authInitialized = new BehaviorSubject<boolean>(false);

  user$ = this.authStatus.asObservable();
  isAuthenticated$ = this.user$.pipe(map(user => !!user));
  isInitialized$ = this.authInitialized.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    console.log('🔄 Initializing AuthService');
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    const userId = localStorage.getItem('userId');
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    console.log('📝 Checking stored auth state:', { userId, isAuthenticated });

    if (userId && isAuthenticated === 'true') {
      this.getLoggedUser().subscribe({
        next: (user) => {
          if (user) {
            console.log('✅ User restored from storage:', user.username);
            this.authStatus.next(user);
          } else {
            console.log('⚠️ Stored user not found');
            this.clearAuthState();
          }
          this.authInitialized.next(true);
        },
        error: (error) => {
          console.error('❌ Error initializing auth:', error);
          this.clearAuthState();
          this.authInitialized.next(true);
        }
      });
    } else {
      console.log('⚠️ No stored auth state');
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

    return this.http.get<User[]>(`${this.apiUrl}?username=${username}`).pipe(
      map(users => {
        const user = users.find(u => u.password === password) || null;

        if (user?.id) {
          localStorage.setItem('userId', user.id);
          localStorage.setItem('username', user.username);
          localStorage.setItem('isAuthenticated', 'true');

          console.log('✅ Login successful:', user.username);
          this.authStatus.next(user);
          return true;
        }

        console.log('❌ Login failed');
        return false;
      })
    );
  }

  logout(): void {
    console.log('🔄 Logging out user');
    const redirectUrl = localStorage.getItem('redirectUrl');
    this.clearAuthState();
    this.router.navigate([redirectUrl || '/inicio']);
  }

  private clearAuthState(): void {
    console.log('🧹 Clearing auth state');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('isAuthenticated');
    this.authStatus.next(null);
  }

  getLoggedUser(): Observable<User | null> {
    const userId = localStorage.getItem('userId');
    console.log('🔍 Getting logged user:', userId);

    if (!userId) {
      console.log('⚠️ No userId found in storage');
      return of(null);
    }

    return this.http.get<User>(`${this.apiUrl}/${userId}`).pipe(
      tap(user => {
        if (user) {
          console.log('✅ User loaded:', user.username);
          this.authStatus.next(user);
        }
      }),
      catchError(error => {
        console.error('❌ Error loading user:', error);
        this.clearAuthState();
        return of(null);
      })
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
              id: Date.now().toString(),
              username,
              email,
              password,
              pollas: [],
              puntaje: 0
            };

            return this.http.post<User>(this.apiUrl, newUser).pipe(
              map(() => 'El usuario se ha creado satisfactoriamente')
            );
          })
        );
      })
    );
  }

  updateUser(user: User): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${user.id}`, user).pipe(
      tap(updatedUser => {
        if (updatedUser.id === this.authStatus.getValue()?.id) {
          this.authStatus.next(updatedUser);
        }
      })
    );
  }

  getUserById(userId: string): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`).pipe(
      catchError(() => of(null))
    );
  }

  getCurrentUserId(): string | null {
    return this.authStatus.getValue()?.id || null;
  }

  actualizarPuntajeUsuario(userId: string, nuevoPuntaje: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}`, { puntaje: nuevoPuntaje }).pipe(
      tap(user => {
        if (user.id === this.authStatus.getValue()?.id) {
          this.authStatus.next(user);
        }
      })
    );
  }

  enviarRecuperacion(email: string): Observable<boolean> {
    return this.http.get<User[]>(`${this.apiUrl}?email=${email.toLowerCase()}`).pipe(
      map(users => users.length > 0)
    );
  }
}
