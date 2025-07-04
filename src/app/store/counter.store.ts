import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

// Define the state interface
interface CounterState {
  count: number;
  lastAction: string;
  history: number[];
}

// Initial state
const initialState: CounterState = {
  count: 0,
  lastAction: 'initial',
  history: [0]
};

// Create the signal store
export const CounterStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Computed signals
    doubleCount: computed(() => store.count() * 2),
    isPositive: computed(() => store.count() > 0),
    isEven: computed(() => store.count() % 2 === 0),
    historyCount: computed(() => store.history().length),
    average: computed(() => {
      const history = store.history();
      return history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0;
    })
  })),
  withMethods((store) => ({
    // State mutation methods
    increment(): void {
      const newCount = store.count() + 1;
      const newHistory = [...store.history(), newCount];
      
      patchState(store, {
        count: newCount,
        lastAction: 'increment',
        history: newHistory
      });
    },
    
    decrement(): void {
      const newCount = Math.max(0, store.count() - 1);
      const newHistory = [...store.history(), newCount];
      
      patchState(store, {
        count: newCount,
        lastAction: 'decrement', 
        history: newHistory
      });
    },
    
    reset(): void {
      patchState(store, {
        count: 0,
        lastAction: 'reset',
        history: [0]
      });
    },
    
    setCount(value: number): void {
      const newCount = Math.max(0, value);
      const newHistory = [...store.history(), newCount];
      
      patchState(store, {
        count: newCount,
        lastAction: 'set',
        history: newHistory
      });
    },
    
    clearHistory(): void {
      patchState(store, {
        history: [store.count()],
        lastAction: 'clearHistory'
      });
    }
  }))
);
