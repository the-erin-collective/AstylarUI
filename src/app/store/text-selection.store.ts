import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import {
  TextSelectionControllerService,
  TextSelectionState
} from '../services/dom/interaction/text-selection-controller.service';
import {
  TextInteractionEntry,
  TextInteractionRegistryEvent,
  TextInteractionRegistryService
} from '../services/dom/interaction/text-interaction-registry.service';

@Injectable({ providedIn: 'root' })
export class TextSelectionStore {
  private readonly controller = inject(TextSelectionControllerService);
  private readonly registry = inject(TextInteractionRegistryService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stateSignal = signal<TextSelectionState>(this.controller.snapshot);

  readonly state = this.stateSignal.asReadonly();
  readonly selection$: Observable<TextSelectionState> = toObservable(this.state);

  readonly elementId = computed(() => this.state().elementId);
  readonly range = computed(() => this.state().range);
  readonly hasSelection = computed(() => this.state().hasSelection);
  readonly isPointerDown = computed(() => this.state().isPointerDown);
  readonly anchorIndex = computed(() => this.state().anchorIndex);
  readonly focusIndex = computed(() => this.state().focusIndex);
  readonly rangeLength = computed(() => {
    const selectionRange = this.state().range;
    return selectionRange ? selectionRange.end - selectionRange.start : 0;
  });

  readonly activeEntry = computed<TextInteractionEntry | undefined>(() => {
    const id = this.elementId();
    return id ? this.registry.getByElementId(id) : undefined;
  });

  readonly activeMetrics = computed(() => this.activeEntry()?.metrics);
  readonly selectedText = computed(() => {
    const entry = this.activeEntry();
    const range = this.state().range;
    if (!entry || !range || !entry.text) {
      return '';
    }

    const textLength = entry.text.length;
    if (!textLength) {
      return '';
    }

    const start = Math.max(0, Math.min(range.start, range.end, textLength));
    const end = Math.max(start, Math.min(range.end, textLength));
    return entry.text.slice(start, end);
  });

  constructor() {
    this.controller.selection$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selection) => this.stateSignal.set(selection));

    this.registry.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handleRegistryEvent(event));
  }

  getSnapshot(): TextSelectionState {
    return this.state();
  }

  clearSelection(): void {
    this.controller.clearSelection();
  }

  private handleRegistryEvent(event: TextInteractionRegistryEvent): void {
    const current = this.state();
    if (!current.elementId) {
      return;
    }

    switch (event.type) {
      case 'unregister':
      case 'clear':
        if (event.type === 'clear' || event.elementId === current.elementId) {
          this.controller.clearSelection();
        }
        break;
      case 'register':
        if (event.entry.elementId !== current.elementId) {
          break;
        }
        this.reconcileSelectionWithEntry(event.entry, current);
        break;
      case 'metrics':
      case 'style':
      case 'text':
        if (event.elementId !== current.elementId) {
          break;
        }
        {
          const entry = this.registry.getByElementId(current.elementId);
          if (entry) {
            this.reconcileSelectionWithEntry(entry, current);
          } else {
            this.controller.clearSelection();
          }
        }
        break;
      default:
        break;
    }
  }

  private reconcileSelectionWithEntry(entry: TextInteractionEntry, current: TextSelectionState): void {
    const caretMax = entry.metrics?.css?.lines?.[entry.metrics.css.lines.length - 1]?.endIndex;
    const limit = caretMax ?? entry.text?.length ?? 0;
    if (current.range && limit >= 0 && (current.range.start > limit || current.range.end > limit)) {
      this.controller.clearSelection();
      return;
    }

    // Re-emit current controller snapshot to trigger downstream recomputation (e.g., highlights)
    const snapshot = this.controller.snapshot;
    this.stateSignal.set({ ...snapshot });
  }
}
