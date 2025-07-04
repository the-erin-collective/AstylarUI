import { Component, signal, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CounterStore } from './store/counter.store';
import { TodoComponent } from './components/todo.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, TodoComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Inject the signal store
  protected counterStore = inject(CounterStore);
  
  // Local signals for app-level state
  protected name = signal('Angular 20 Signals App');
  
  // Computed signals
  protected greeting = computed(() => `Hello from ${this.name()}!`);
  
  // Store-based computed values are available directly through counterStore
  // counterStore.count(), counterStore.doubleCount(), etc.
  
  // Methods that delegate to the store
  increment() {
    this.counterStore.increment();
  }
  
  decrement() {
    this.counterStore.decrement();
  }
  
  reset() {
    this.counterStore.reset();
  }
  
  clearHistory() {
    this.counterStore.clearHistory();
  }
}
