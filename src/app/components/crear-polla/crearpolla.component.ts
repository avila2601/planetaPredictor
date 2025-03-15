import { Component, EventEmitter, Output, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PollaService } from '../../services/polla.service';

@Component({
  selector: 'app-crear-polla',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crearpolla.component.html',
  styleUrls: ['./crearpolla.component.scss']
})
export class CrearPollaComponent implements OnInit, OnDestroy {
  @Output() modalCerrado = new EventEmitter<void>();

  torneos: { name: string; leagueId: number }[] = [];
  torneoSeleccionado: { name: string; leagueId: number } | null = null;
  nombrePolla: string = '';
  condiciones: string = '';

  @ViewChild('modalContent') modalContent!: ElementRef;

  constructor(private pollaService: PollaService, private el: ElementRef) {}

  ngOnInit() {
    this.cargarTorneos();
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('click', this.handleClickOutside);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.handleClickOutside);
  }

  handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.cerrarModal();
    }
  };

  handleClickOutside = (event: Event) => {
    if (this.modalContent && !this.modalContent.nativeElement.contains(event.target)) {
      this.cerrarModal();
    }
  };

  cerrarModal() {
    this.modalCerrado.emit();
  }

  cargarTorneos() {
    this.pollaService.getAllTorneos().subscribe((torneos: { name: string; leagueId: number }[]) => {
      this.torneos = torneos;
    });
  }

  handleGuardar() {
    if (!this.nombrePolla || !this.torneoSeleccionado || !this.condiciones) {
      alert("Todos los campos son obligatorios");
      return;
    }

    // Verificar que torneoSeleccionado no sea null antes de acceder a sus propiedades
    if (!this.torneoSeleccionado?.name || !this.torneoSeleccionado?.leagueId) {
      console.error("❌ Error: El torneo seleccionado es inválido.");
      return;
    }

    this.pollaService.obtenerDatosLiga(this.torneoSeleccionado.leagueId)
      .subscribe(
        (datosLiga) => {
          if (!datosLiga) {
            console.error("❌ Error: No se encontraron datos de la liga.");
            return;
          }

          const torneo = {
            name: this.torneoSeleccionado!.name, // ! asegura que el valor no es null
            leagueId: this.torneoSeleccionado!.leagueId,
            leagueShortcut: datosLiga.leagueShortcut,
            leagueSeason: datosLiga.leagueSeason
          };

          this.pollaService.crearPolla(this.nombrePolla, torneo, this.condiciones)
            .subscribe(
              () => {
                console.log("✅ Polla creada correctamente");
                // Recargar las pollas después de crear una nueva polla
                this.pollaService.obtenerPollas().subscribe((pollas) => {
                  console.log("Pollas actualizadas", pollas);
                });
                this.modalCerrado.emit();
                this.cerrarModal();
              },
              (error) => {
                console.error("❌ Error al crear la polla:", error);
                alert("Hubo un error al crear la polla. Intenta de nuevo.");
              }
            );
        },
        (error) => {
          console.error("❌ Error obteniendo datos de la liga:", error);
          alert("No se pudieron obtener los datos de la liga. Intenta de nuevo.");
        }
      );
  }
}
