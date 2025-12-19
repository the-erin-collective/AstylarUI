import { Injectable } from '@angular/core';
import { InputElement, TextInput, Button, CheckboxInput, RadioInput, SelectElement, InputType, CursorDirection } from '../../../types/input-types';
import { TextInputManager } from './text-input.manager';
import { ButtonManager } from './button.manager';
import { CheckboxManager } from './checkbox.manager';
import { SelectManager } from './select.manager';
import * as BABYLON from '@babylonjs/core';
import { StyleRule } from '../../../types/style-rule';

/**
 * Service responsible for handling keyboard input for input elements
 */
@Injectable({
    providedIn: 'root'
})
export class KeyboardInputHandler {
    constructor(
        private textInputManager: TextInputManager,
        private buttonManager: ButtonManager,
        private checkboxManager: CheckboxManager,
        private selectManager: SelectManager
    ) { }

    /**
     * Handles keyboard events for input elements
     */
    handleKeyboardEvent(
        event: KeyboardEvent,
        inputElement: InputElement,
        scene: BABYLON.Scene,
        style: StyleRule
    ): void {
        if (!inputElement.focused) return;

        switch (inputElement.type) {
            case InputType.Text:
            case InputType.Password:
            case InputType.Email:
            case InputType.Number:
            case InputType.Textarea:
                this.handleTextInput(event, inputElement as TextInput, scene, style);
                break;

            case InputType.Button:
            case InputType.Submit:
                this.handleButtonKeyboard(event, inputElement as Button);
                break;

            case InputType.Checkbox:
                this.handleCheckboxKeyboard(event, inputElement as CheckboxInput);
                break;

            case InputType.Radio:
                this.handleRadioKeyboard(event, inputElement as RadioInput);
                break;

            case InputType.Select:
                this.handleSelectKeyboard(event, inputElement as SelectElement);
                break;
        }
    }

    /**
     * Handles keyboard input for text fields
     */
    private handleTextInput(event: KeyboardEvent, textInput: TextInput, scene: BABYLON.Scene, style: StyleRule): void {
        switch (event.key) {
            case 'ArrowLeft':
                // TODO: Implement moveCursor method in TextInputManager
                // this.textInputManager.moveCursor(textInput, CursorDirection.Left, event.shiftKey);
                event.preventDefault();
                break;

            case 'ArrowRight':
                // TODO: Implement moveCursor method in TextInputManager
                // this.textInputManager.moveCursor(textInput, CursorDirection.Right, event.shiftKey);
                event.preventDefault();
                break;

            case 'Home':
                // TODO: Implement moveCursor method in TextInputManager
                // this.textInputManager.moveCursor(textInput, CursorDirection.Home, event.shiftKey);
                event.preventDefault();
                break;

            case 'End':
                // TODO: Implement moveCursor method in TextInputManager
                // this.textInputManager.moveCursor(textInput, CursorDirection.End, event.shiftKey);
                event.preventDefault();
                break;

            case 'Backspace':
                // TODO: Implement deleteCharacter method in TextInputManager
                // this.textInputManager.deleteCharacter(textInput, -1, scene, style);
                event.preventDefault();
                break;

            case 'Delete':
                // TODO: Implement deleteCharacter method in TextInputManager
                // this.textInputManager.deleteCharacter(textInput, 1, scene, style);
                event.preventDefault();
                break;

            case 'Enter':
                if (textInput.type === InputType.Textarea) {
                    // TODO: Implement insertTextAtCursor method in TextInputManager
                    // this.textInputManager.insertTextAtCursor(textInput, '\n', scene, style);
                }
                event.preventDefault();
                break;

            case 'Tab':
                // Tab navigation handled by FocusManager
                break;

            default:
                // Insert printable characters
                if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    // TODO: Implement insertTextAtCursor method in TextInputManager
                    // this.textInputManager.insertTextAtCursor(textInput, event.key, scene, style);
                    event.preventDefault();
                }
                break;
        }
    }

    /**
     * Handles keyboard input for buttons
     */
    private handleButtonKeyboard(event: KeyboardEvent, button: Button): void {
        if (event.key === 'Enter' || event.key === ' ') {
            this.buttonManager.handleButtonClick(button);
            event.preventDefault();
        }
    }

    /**
     * Handles keyboard input for checkboxes
     */
    private handleCheckboxKeyboard(event: KeyboardEvent, checkbox: CheckboxInput): void {
        if (event.key === ' ') {
            this.checkboxManager.toggleCheckbox(checkbox);
            event.preventDefault();
        }
    }

    /**
     * Handles keyboard input for radio buttons
     */
    private handleRadioKeyboard(event: KeyboardEvent, radio: RadioInput): void {
        if (event.key === ' ') {
            this.checkboxManager.selectRadioButton(radio);
            event.preventDefault();
        }
    }

    /**
     * Handles keyboard input for select dropdowns
     */
    private handleSelectKeyboard(event: KeyboardEvent, selectElement: SelectElement): void {
        switch (event.key) {
            case 'ArrowUp':
                if (selectElement.dropdownOpen) {
                    // TODO: Implement navigateOptions method in SelectManager
                    // this.selectManager.navigateOptions(selectElement, 'up');
                }
                event.preventDefault();
                break;

            case 'ArrowDown':
                if (selectElement.dropdownOpen) {
                    // TODO: Implement navigateOptions method in SelectManager
                    // this.selectManager.navigateOptions(selectElement, 'down');
                }
                event.preventDefault();
                break;

            case 'Enter':
            case ' ':
                if (!selectElement.dropdownOpen) {
                    this.selectManager.openDropdown(selectElement, {} as BABYLON.Scene, {} as StyleRule);
                }
                event.preventDefault();
                break;

            case 'Escape':
                if (selectElement.dropdownOpen) {
                    this.selectManager.closeDropdown(selectElement);
                }
                event.preventDefault();
                break;
        }
    }

    /**
     * Prevents event propagation to other handlers
     */
    preventEventPropagation(event: KeyboardEvent): void {
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
}
