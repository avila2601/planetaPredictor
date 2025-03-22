import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PollaService } from '../../services/polla.service';
import { Polla } from '../../models/polla.model';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-administrar',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './administrar.component.html',
  styleUrl: './administrar.component.scss'
})
export class AdministrarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  polla: Polla | null = null;
  inviteLink: string = '';
  linkCopied: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private pollaService: PollaService
  ) {}

  ngOnInit(): void {
    const pollaId = this.route.snapshot.paramMap.get('id');
    if (pollaId) {
      this.pollaService.getPollaById(pollaId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(polla => {
          this.polla = polla;
          this.loadInviteLink();
        });
    }
  }

  private loadInviteLink(): void {
    if (!this.polla?.inviteCode) {
      this.pollaService.generateInviteCode(this.polla!).pipe(
        takeUntil(this.destroy$)
      ).subscribe(updatedPolla => {
        this.polla = updatedPolla;
        this.inviteLink = this.pollaService.getInviteLink(updatedPolla);
      });
    } else {
      this.inviteLink = this.pollaService.getInviteLink(this.polla);
    }
  }

  async copyInviteLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteLink);
      this.linkCopied = true;
      setTimeout(() => this.linkCopied = false, 2000);
    } catch (err) {
      console.error('Error al copiar link:', err);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
