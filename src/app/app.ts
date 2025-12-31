import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TextSelectionKeyboardService } from './services/dom/interaction/text-selection-keyboard.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Instantiate keyboard service to enable global text selection shortcuts
  private readonly textSelectionKeyboard = inject(TextSelectionKeyboardService);
}
