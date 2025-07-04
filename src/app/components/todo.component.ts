import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-todo',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todo-container">
      <h3>Todo List with Signals</h3>
      
      <div class="todo-form">
        <input 
          [(ngModel)]="newTodoText" 
          (keyup.enter)="addTodo()"
          placeholder="Add a new todo..."
          class="todo-input"
        >
        <button (click)="addTodo()" [disabled]="!newTodoText().trim()">Add</button>
      </div>

      <div class="todo-stats">
        <p>Total: {{ totalTodos() }} | Completed: {{ completedTodos() }} | Remaining: {{ remainingTodos() }}</p>
      </div>

      <div class="todo-filters">
        <button 
          *ngFor="let filterOption of filterOptions" 
          (click)="filter.set(filterOption.value)"
          [class.active]="filter() === filterOption.value"
        >
          {{ filterOption.label }}
        </button>
      </div>

      <div class="todo-list">
        @for (todo of filteredTodos(); track todo.id) {
          <div class="todo-item" [class.completed]="todo.completed">
            <input 
              type="checkbox" 
              [checked]="todo.completed"
              (change)="toggleTodo(todo.id)"
            >
            <span class="todo-text">{{ todo.text }}</span>
            <span class="todo-date">{{ todo.createdAt | date:'short' }}</span>
            <button (click)="removeTodo(todo.id)" class="remove-btn">×</button>
          </div>
        } @empty {
          <p class="empty-state">{{ getEmptyMessage() }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .todo-container {
      background: #f8fafc;
      border-radius: 12px;
      padding: 2rem;
      border: 1px solid #e2e8f0;
      margin-top: 2rem;
    }

    .todo-form {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;

      .todo-input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 1rem;

        &:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
      }

      button {
        padding: 0.75rem 1.5rem;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &:hover:not(:disabled) {
          background: #5b6bc5;
        }
      }
    }

    .todo-stats {
      background: #e0e7ff;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;

      p {
        margin: 0;
        color: #3730a3;
        font-weight: 500;
      }
    }

    .todo-filters {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;

      button {
        padding: 0.5rem 1rem;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;

        &.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        &:hover:not(.active) {
          background: #f3f4f6;
        }
      }
    }

    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      transition: all 0.2s;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &.completed {
        opacity: 0.6;

        .todo-text {
          text-decoration: line-through;
        }
      }

      .todo-text {
        flex: 1;
        font-size: 1rem;
      }

      .todo-date {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .remove-btn {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 4px;
        width: 24px;
        height: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        line-height: 1;

        &:hover {
          background: #dc2626;
        }
      }
    }

    .empty-state {
      text-align: center;
      color: #6b7280;
      font-style: italic;
      padding: 2rem;
    }
  `]
})
export class TodoComponent {
  // Signals for state management
  protected todos = signal<Todo[]>([]);
  protected newTodoText = signal('');
  protected filter = signal<'all' | 'active' | 'completed'>('all');
  
  // Computed signals
  protected totalTodos = computed(() => this.todos().length);
  protected completedTodos = computed(() => 
    this.todos().filter(todo => todo.completed).length
  );
  protected remainingTodos = computed(() => 
    this.todos().filter(todo => !todo.completed).length
  );
  
  protected filteredTodos = computed(() => {
    const todos = this.todos();
    const currentFilter = this.filter();
    
    switch (currentFilter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  });

  // Filter options
  protected filterOptions = [
    { value: 'all' as const, label: 'All' },
    { value: 'active' as const, label: 'Active' },
    { value: 'completed' as const, label: 'Completed' }
  ];

  private nextId = 1;

  addTodo(): void {
    const text = this.newTodoText().trim();
    if (!text) return;

    const newTodo: Todo = {
      id: this.nextId++,
      text,
      completed: false,
      createdAt: new Date()
    };

    this.todos.update(todos => [...todos, newTodo]);
    this.newTodoText.set('');
  }

  toggleTodo(id: number): void {
    this.todos.update(todos =>
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  removeTodo(id: number): void {
    this.todos.update(todos => todos.filter(todo => todo.id !== id));
  }

  getEmptyMessage(): string {
    const currentFilter = this.filter();
    switch (currentFilter) {
      case 'active':
        return 'No active todos!';
      case 'completed':
        return 'No completed todos!';
      default:
        return 'No todos yet. Add one above!';
    }
  }
}
