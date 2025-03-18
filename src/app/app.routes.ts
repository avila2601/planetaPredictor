import { Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { GruposActivosComponent } from './components/grupos-activos/grupos-activos.component';
import { PosicionesComponent } from './components/posiciones/posiciones.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { InfoGeneralComponent } from './components/info-general/info-general.component';
import { PronosticosComponent } from './components/pronosticos/pronosticos.component';
import { AuthGuard } from './guards/auth.guard';
import { RegistroComponent } from './components/registro/registro.component';
import { RecuperarPasswordComponent } from './components/recuperar-password/recuperar-password.component';
import { CrearPollaComponent } from './components/crear-polla/crearpolla.component';
import { AdministrarComponent } from './components/administrar/administrar.component';

export const routes: Routes = [
  { path: '', component: InicioComponent },
  { path: 'inicio', component: InicioComponent },
  { path: 'grupos-activos', component: GruposActivosComponent, canActivate: [AuthGuard] },
  { path: 'pronosticos', component: PronosticosComponent, canActivate: [AuthGuard] },
  { path: 'pronosticos/:id', component: PronosticosComponent, canActivate: [AuthGuard] },
  { path: 'posiciones', component: PosicionesComponent, canActivate: [AuthGuard] },
  { path: 'posiciones/:id', component: PosicionesComponent, canActivate: [AuthGuard] },
  { path: 'perfil', component: PerfilComponent, canActivate: [AuthGuard] },
  { path: 'info-general', component: InfoGeneralComponent, canActivate: [AuthGuard] },
  { path: 'recuperar-password', component: RecuperarPasswordComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'modal', component: CrearPollaComponent },
  { path: 'administrar', component: AdministrarComponent },
  { path: '**', redirectTo: '' }
];
