import { Component, EventEmitter, Output, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { PollaService } from '../../services/polla.service';
import { Polla } from '../../models/polla.model';

interface TorneoTemp {
  name: string;
  leagueId: string;
  leagueShortcut: string;
  leagueSeason: string;
}

@Component({
  selector: 'app-crear-polla',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crearpolla.component.html',
  styleUrls: ['./crearpolla.component.scss']
})
export class CrearPollaComponent implements OnInit, OnDestroy {
  @Output() modalCerrado = new EventEmitter<void>();
  @ViewChild('modalContent') modalContent!: ElementRef;

  private destroy$ = new Subject<void>();

  torneos: TorneoTemp[] = [];
  torneoSeleccionado: TorneoTemp | null = null;
  nombrePolla: string = '';
  condiciones: string = '';

  constructor(
    private pollaService: PollaService,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.cargarTorneos();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.removeEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('click', this.handleClickOutside);
  }

  private removeEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.handleClickOutside);
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.cerrarModal();
    }
  };

  private handleClickOutside = (event: Event): void => {
    if (this.modalContent && !this.modalContent.nativeElement.contains(event.target)) {
      this.cerrarModal();
    }
  };

  cerrarModal(): void {
    this.modalCerrado.emit();
  }

  private cargarTorneos(): void {
    this.pollaService.getAllTorneos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (torneos) => this.torneos = torneos,
        error: (error) => console.error('Error cargando torneos:', error)
      });
  }

  handleGuardar(): void {
    if (!this.validarFormulario()) return;
    if (!this.torneoSeleccionado) return;

    this.pollaService.crearPolla(
      this.nombrePolla,
      this.torneoSeleccionado,
      this.condiciones
    ).pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.log("✅ Polla creada correctamente");
        this.cerrarModal(); // Solo llamamos cerrarModal una vez
      },
      error: (error) => {
        console.error("❌ Error al crear la polla:", error);
        alert("Hubo un error al crear la polla. Intenta de nuevo.");
      }
    });
}

  private validarFormulario(): boolean {
    if (!this.nombrePolla || !this.torneoSeleccionado || !this.condiciones) {
      alert("Todos los campos son obligatorios");
      return false;
    }

    if (!this.torneoSeleccionado?.name || !this.torneoSeleccionado?.leagueId) {
      console.error("❌ Error: El torneo seleccionado es inválido.");
      return false;
    }

    return true;
  }
}
