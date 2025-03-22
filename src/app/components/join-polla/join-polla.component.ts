import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, filter, take, switchMap } from 'rxjs';
import { PollaService } from '../../services/polla.service';
import { AuthService } from '../../services/auth.service';
import { Polla } from '../../models/polla.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-join-polla',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './join-polla.component.html',
  styleUrls: ['./join-polla.component.scss']
})
export class JoinPollaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  polla: Polla | null = null;
  admin: User | null = null;
  loading = true;
  error: string | null = null;
  isParticipant = false;
  currentUser: User | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pollaService: PollaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('🔄 JoinPollaComponent initialized');
    const pollaId = this.route.snapshot.paramMap.get('pollaId');
    const inviteCode = this.route.snapshot.paramMap.get('inviteCode');

    console.log('📝 Route params:', { pollaId, inviteCode });

    if (!pollaId || !inviteCode) {
      console.error('❌ Missing route parameters');
      this.error = 'Link de invitación inválido';
      this.loading = false;
      return;
    }

    // Wait for auth initialization before checking state
    this.authService.waitForAuthInit().pipe(
      switchMap(() => this.authService.user$),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        console.log('👤 User state after init:', user);
        if (!user) {
          console.log('⚠️ No user logged in, saving redirect URL');
          localStorage.setItem('redirectUrl', this.router.url);
          this.router.navigate(['/inicio']);
          return;
        }
        this.currentUser = user;
        this.loadPolla(pollaId, inviteCode);
      },
      error: (error) => {
        console.error('❌ Auth error:', error);
        this.error = 'Error de autenticación';
        this.loading = false;
      }
    });
  }

  private loadPolla(pollaId: string, inviteCode: string): void {
    console.log('🔄 Loading polla data:', { pollaId, inviteCode });

    this.pollaService.getPollaById(pollaId).subscribe({
      next: (polla) => {
        console.log('📋 Polla data:', polla);
        if (!polla || polla.inviteCode !== inviteCode) {
          console.error('❌ Invalid invite code or polla not found');
          this.error = 'Link de invitación inválido';
          this.loading = false;
          return;
        }

        this.polla = polla;
        this.isParticipant = polla.participants.includes(this.currentUser!.id);
        console.log('🎯 Is participant:', this.isParticipant);

        this.authService.getUserById(polla.adminId).subscribe({
          next: (admin) => {
            console.log('👑 Admin data:', admin);
            this.admin = admin;
            this.loading = false;
          },
          error: (error) => {
            console.error('❌ Error loading admin:', error);
            this.error = 'Error cargando información del administrador';
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading polla:', error);
        this.error = 'Error cargando la información de la polla';
        this.loading = false;
      }
    });
  }

  joinPolla(): void {
    if (!this.polla || !this.currentUser) {
      console.error('❌ Cannot join: Missing polla or user data');
      return;
    }

    console.log('🤝 Joining polla:', {
      pollaId: this.polla.id,
      userId: this.currentUser.id
    });

    this.loading = true;
    this.pollaService.addParticipant(this.polla.id!, this.currentUser.id)
      .subscribe({
        next: () => {
          console.log('✅ Successfully joined polla');
          this.router.navigate(['/grupos-activos']);
        },
        error: (error) => {
          console.error('❌ Error joining polla:', error);
          this.error = 'Error al unirse a la polla';
          this.loading = false;
        }
      });
  }

  regresar(): void {
    const hasRedirect = localStorage.getItem('redirectUrl');
    if (hasRedirect) {
      localStorage.removeItem('redirectUrl');
      this.router.navigate(['/grupos-activos']);
    } else {
      this.router.navigate(['/inicio']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
