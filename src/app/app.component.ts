import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { LoginComponent } from "./components/login/login.component";


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, NavBarComponent, LoginComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'planeta-predictor';
}
