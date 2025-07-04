import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterStore } from '../store/counter.store';
import { TodoComponent } from './todo.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, TodoComponent],
  template: `
    <section class="signals-demo">
      <h2>NgRx Signals Store Demo</h2>
      
      <div class="counter-section">
        <h3>Counter with State Management</h3>
        <div class="counter-display">
          <p>Count: <strong>{{ counterStore.count() }}</strong></p>
          <p>Double Count: <strong>{{ counterStore.doubleCount() }}</strong></p>
          <p>Is Positive: <strong>{{ counterStore.isPositive() ? 'Yes' : 'No' }}</strong></p>
          <p>Is Even: <strong>{{ counterStore.isEven() ? 'Yes' : 'No' }}</strong></p>
          <p>Last Action: <strong>{{ counterStore.lastAction() }}</strong></p>
          <p>History Count: <strong>{{ counterStore.historyCount() }}</strong></p>
          <p>Average: <strong>{{ counterStore.average().toFixed(2) }}</strong></p>
        </div>
        
        <div class="counter-controls">
          <button (click)="decrement()" [disabled]="counterStore.count() <= 0">-</button>
          <button (click)="increment()">+</button>
          <button (click)="reset()">Reset</button>
          <button (click)="clearHistory()">Clear History</button>
        </div>
        
        <div class="history-section" *ngIf="counterStore.history().length > 1">
          <h4>History</h4>
          <div class="history-items">
            @for (value of counterStore.history(); track $index) {
              <span class="history-item">{{ value }}</span>
            }
          </div>
        </div>
      </div>
    </section>

    <section class="features-demo">
      <h2>Signal-Based Components</h2>
      <app-todo></app-todo>
    </section>
  `,
  styles: [`
    .signals-demo {
      .counter-section {
        background: #f8fafc;
        border-radius: 12px;
        padding: 2rem;
        border: 1px solid #e2e8f0;

        h3 {
          margin: 0 0 1.5rem 0;
          color: #374151;
          font-size: 1.5rem;
        }

        .counter-display {
          margin-bottom: 2rem;

          p {
            font-size: 1.2rem;
            margin: 0.5rem 0;
            
            strong {
              color: #667eea;
              font-weight: 600;
            }
          }
        }

        .counter-controls {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;

          button {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;

            &:hover:not(:disabled) {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
              transform: none;
            }

            &:active:not(:disabled) {
              transform: translateY(0);
            }
          }
        }

        .history-section {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;

          h4 {
            margin: 0 0 1rem 0;
            color: #374151;
            font-size: 1.2rem;
          }

          .history-items {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;

            .history-item {
              background: #667eea;
              color: white;
              padding: 0.25rem 0.75rem;
              border-radius: 16px;
              font-size: 0.875rem;
              font-weight: 500;
            }
          }
        }
      }
    }

    h2 {
      font-size: 2rem;
      font-weight: 600;
      margin: 0 0 2rem 0;
      color: #1f2937;
    }
  `]
})
export class HomeComponent {
  // Inject the signal store
  protected counterStore = inject(CounterStore);
  
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
