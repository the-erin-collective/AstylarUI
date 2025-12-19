# Design Document

## Overview

The Functional Input Elements feature will provide comprehensive interactive input capabilities for ASTYLARUI by implementing text fields, buttons, checkboxes, radio buttons, and select dropdowns as functional 3D elements. The design creates a layered input system with cursor management, text selection, keyboard navigation, and form validation while maintaining integration with existing styling and layout systems.

## Architecture

### Core Components

#### InputElementService
The main service responsible for input element management and coordination.

```typescript
interface InputElementService {
  createInputElement(element: DomElement, inputType: InputType): InputElement;
  focusInputElement(inputElement: InputElement): void;
  handleKeyboardInput(inputElement: InputElement, event: KeyboardEvent): void;
  updateInputValue(inputElement: InputElement, value: any): void;
  validateInput(inputElement: InputElement): ValidationResult;
}
```

#### TextInputManager
Manages text input fields with cursor positioning and text selection.

```typescript
interface TextInputManager {
  createTextInput(element: DomElement): TextInput;
  insertTextAtCursor(textInput: TextInput, text: string): void;
  moveCursor(textInput: TextInput, direction: CursorDirection, extend?: boolean): void;
  selectText(textInput: TextInput, start: number, end: number): void;
  renderTextCursor(textInput: TextInput): void;
}
```

#### ButtonManager
Handles button interactions and state management.

```typescript
interface ButtonManager {
  createButton(element: DomElement): Button;
  handleButtonInteraction(button: Button, interaction: ButtonInteraction): void;
  updateButtonState(button: Button, state: ButtonState): void;
  executeButtonAction(button: Button): void;
}
```

#### FormManager
Manages form validation and submission.

```typescript
interface FormManager {
  createForm(element: DomElement): Form;
  validateForm(form: Form): FormValidationResult;
  submitForm(form: Form): void;
  addValidationRule(inputElement: InputElement, rule: ValidationRule): void;
}
```

### Input Element Types

```typescript
enum InputType {
  Text = 'text',
  Password = 'password',
  Email = 'email',
  Number = 'number',
  Button = 'button',
  Submit = 'submit',
  Checkbox = 'checkbox',
  Radio = 'radio',
  Select = 'select',
  Textarea = 'textarea'
}
```

## Components and Interfaces

### InputElement
Base interface for all input elements:

```typescript
interface InputElement {
  element: DomElement;
  type: InputType;
  value: any;
  focused: boolean;
  disabled: boolean;
  required: boolean;
  validationRules: ValidationRule[];
  validationState: ValidationState;
  mesh: BABYLON.Mesh;
  interactionHandler: InputInteractionHandler;
}
```

### TextInput
Specialized interface for text input elements:

```typescript
interface TextInput extends InputElement {
  textContent: string;
  cursorPosition: number;
  selectionStart: number;
  selectionEnd: number;
  textMesh: BABYLON.Mesh;
  cursorMesh: BABYLON.Mesh;
  selectionMesh?: BABYLON.Mesh;
  placeholder?: string;
  maxLength?: number;
}
```

### Button
Interface for button elements:

```typescript
interface Button extends InputElement {
  label: string;
  state: ButtonState;
  action?: () => void;
  buttonType: 'button' | 'submit' | 'reset';
}

enum ButtonState {
  Normal = 'normal',
  Hover = 'hover',
  Pressed = 'pressed',
  Disabled = 'disabled',
  Focused = 'focused'
}
```

### SelectElement
Interface for dropdown select elements:

```typescript
interface SelectElement extends InputElement {
  options: SelectOption[];
  selectedIndex: number;
  dropdownOpen: boolean;
  dropdownMesh?: BABYLON.Mesh;
  optionMeshes: BABYLON.Mesh[];
}

interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}
```

## Data Models

### ValidationRule
Configuration for input validation:

```typescript
interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'number' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### Form
Form container and management:

```typescript
interface Form {
  element: DomElement;
  inputs: InputElement[];
  validationRules: Map<InputElement, ValidationRule[]>;
  submitHandler?: (formData: FormData) => void;
  validationState: FormValidationResult;
}

interface FormValidationResult {
  valid: boolean;
  fieldErrors: Map<InputElement, string[]>;
  globalErrors: string[];
}
```

### CursorState
Text cursor positioning and selection:

```typescript
interface CursorState {
  position: number;
  visible: boolean;
  blinkTimer: number;
  selectionActive: boolean;
  selectionStart: number;
  selectionEnd: number;
}
```

## Implementation Strategy

### Text Input Implementation

```typescript
class TextInputRenderer {
  createTextInput(element: DomElement): TextInput {
    // Create input field background
    const inputMesh = this.createInputBackground(element);
    
    // Create text mesh for content
    const textMesh = this.textRenderingService.createTextMesh(element.textContent || '', element.style);
    
    // Create cursor mesh
    const cursorMesh = this.createTextCursor();
    
    // Position elements
    this.positionTextElements(inputMesh, textMesh, cursorMesh);
    
    return {
      element,
      type: InputType.Text,
      value: element.textContent || '',
      textContent: element.textContent || '',
      cursorPosition: 0,
      selectionStart: 0,
      selectionEnd: 0,
      textMesh,
      cursorMesh,
      mesh: inputMesh,
      focused: false,
      disabled: false,
      required: false,
      validationRules: [],
      validationState: { valid: true, errors: [] },
      interactionHandler: new TextInputInteractionHandler()
    };
  }
  
  private createTextCursor(): BABYLON.Mesh {
    const cursor = BABYLON.MeshBuilder.CreateBox("textCursor", {
      width: 0.02,
      height: 0.8,
      depth: 0.01
    }, this.scene);
    
    const material = new BABYLON.StandardMaterial("cursorMaterial", this.scene);
    material.diffuseColor = BABYLON.Color3.Black();
    cursor.material = material;
    
    return cursor;
  }
}
```

### Keyboard Input Handling

```typescript
class KeyboardInputHandler {
  handleKeyboardEvent(event: KeyboardEvent, inputElement: InputElement): void {
    if (!inputElement.focused) return;
    
    switch (inputElement.type) {
      case InputType.Text:
        this.handleTextInput(event, inputElement as TextInput);
        break;
      case InputType.Button:
        this.handleButtonKeyboard(event, inputElement as Button);
        break;
      case InputType.Select:
        this.handleSelectKeyboard(event, inputElement as SelectElement);
        break;
    }
  }
  
  private handleTextInput(event: KeyboardEvent, textInput: TextInput): void {
    switch (event.key) {
      case 'ArrowLeft':
        this.moveCursor(textInput, -1, event.shiftKey);
        break;
      case 'ArrowRight':
        this.moveCursor(textInput, 1, event.shiftKey);
        break;
      case 'Backspace':
        this.deleteCharacter(textInput, -1);
        break;
      case 'Delete':
        this.deleteCharacter(textInput, 1);
        break;
      default:
        if (event.key.length === 1) {
          this.insertCharacter(textInput, event.key);
        }
    }
    
    event.preventDefault();
  }
}
```

### Button Interaction Implementation

```typescript
class ButtonInteractionHandler {
  handleButtonClick(button: Button): void {
    if (button.disabled) return;
    
    // Visual feedback
    this.updateButtonState(button, ButtonState.Pressed);
    
    // Execute action after brief delay for visual feedback
    setTimeout(() => {
      this.updateButtonState(button, ButtonState.Normal);
      if (button.action) {
        button.action();
      }
    }, 100);
  }
  
  updateButtonState(button: Button, state: ButtonState): void {
    button.state = state;
    
    const material = button.mesh.material as BABYLON.StandardMaterial;
    
    switch (state) {
      case ButtonState.Normal:
        material.diffuseColor = BABYLON.Color3.Gray();
        break;
      case ButtonState.Hover:
        material.diffuseColor = BABYLON.Color3.White();
        break;
      case ButtonState.Pressed:
        material.diffuseColor = BABYLON.Color3.Black();
        button.mesh.position.y -= 0.05; // Press down effect
        break;
      case ButtonState.Disabled:
        material.diffuseColor = BABYLON.Color3.FromHexString("#CCCCCC");
        break;
    }
  }
}
```

### Form Validation Implementation

```typescript
class FormValidator {
  validateInput(inputElement: InputElement): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of inputElement.validationRules) {
      if (!this.validateRule(inputElement.value, rule)) {
        errors.push(rule.message);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private validateRule(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'minLength':
        return typeof value === 'string' && value.length >= rule.value;
      case 'maxLength':
        return typeof value === 'string' && value.length <= rule.value;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'pattern':
        return new RegExp(rule.value).test(value);
      case 'custom':
        return rule.validator ? rule.validator(value) : true;
      default:
        return true;
    }
  }
}
```

## Integration Points

### BabylonDomService Extension
Integration with existing DOM element creation:

```typescript
// In babylon-dom.service.ts
private handleInputElement(element: DomElement): void {
  const inputType = this.determineInputType(element);
  
  if (inputType !== null) {
    const inputElement = this.inputElementService.createInputElement(element, inputType);
    element.inputElement = inputElement;
    
    // Set up event listeners
    this.setupInputEventListeners(inputElement);
  }
}
```

### Event System Integration
Coordination with existing interaction systems:

```typescript
// In event handling
private handleInputInteraction(event: InteractionEvent): void {
  const element = event.target;
  
  if (element.inputElement) {
    switch (event.type) {
      case 'click':
        this.inputElementService.focusInputElement(element.inputElement);
        break;
      case 'keydown':
        this.inputElementService.handleKeyboardInput(element.inputElement, event as KeyboardEvent);
        break;
    }
  }
}
```

## Focus Management

### Focus System Implementation

```typescript
class FocusManager {
  private focusedElement: InputElement | null = null;
  private tabOrder: InputElement[] = [];
  
  focusElement(inputElement: InputElement): void {
    if (this.focusedElement) {
      this.blurElement(this.focusedElement);
    }
    
    this.focusedElement = inputElement;
    inputElement.focused = true;
    
    // Update visual focus indicator
    this.showFocusIndicator(inputElement);
    
    // Start cursor blinking for text inputs
    if (inputElement.type === InputType.Text) {
      this.startCursorBlink(inputElement as TextInput);
    }
  }
  
  handleTabNavigation(forward: boolean = true): void {
    if (this.tabOrder.length === 0) return;
    
    const currentIndex = this.focusedElement ? 
      this.tabOrder.indexOf(this.focusedElement) : -1;
    
    let nextIndex;
    if (forward) {
      nextIndex = (currentIndex + 1) % this.tabOrder.length;
    } else {
      nextIndex = currentIndex <= 0 ? this.tabOrder.length - 1 : currentIndex - 1;
    }
    
    this.focusElement(this.tabOrder[nextIndex]);
  }
}
```

## Error Handling

### Input Validation Errors
- Handle invalid input values gracefully
- Display validation messages near input fields
- Prevent form submission with invalid data

### Interaction Conflicts
- Resolve conflicts between input focus and other interactions
- Handle keyboard event conflicts with camera controls
- Manage overlapping input elements

### Performance Considerations
- Optimize text rendering for input fields
- Implement efficient cursor blinking animations
- Manage memory for dynamic form elements

```typescript
interface InputErrorHandler {
  handleValidationError(inputElement: InputElement, errors: string[]): void;
  handleKeyboardConflict(event: KeyboardEvent, inputElement: InputElement): boolean;
  handleFocusConflict(inputElement: InputElement): void;
}
```

## Testing Strategy

### Visual Test Sites
Test sites will be created in `site-data.service.ts` to validate input functionality:

1. **Text Input Fields**: Various text input types with cursor positioning and selection
2. **Button Interactions**: Different button states and action execution
3. **Checkbox and Radio**: Selection controls with grouping and labels
4. **Dropdown Selects**: Option selection and keyboard navigation
5. **Form Validation**: Input validation rules and error display
6. **Keyboard Navigation**: Tab order and keyboard accessibility
7. **Complex Forms**: Multi-field forms with validation and submission

### Expected Visual Outcomes
Each test site will include documentation of expected input behavior, interaction responses, and validation feedback.

## Dependencies

### Browser APIs
- Keyboard Event API for input handling
- Focus management APIs
- Clipboard API for copy/paste functionality

### BabylonJS Features
- Mesh creation for input field backgrounds
- Material system for input styling and states
- Text rendering integration for input content

### Existing ASTYLARUI Services
- TextRenderingService: Text display within input fields
- BabylonDomService: DOM element integration
- Event system: Keyboard and pointer event handling
- Style system: Input element styling and theming

## Future Enhancements

### Advanced Input Types
- Date and time picker inputs
- Color picker inputs
- Range slider inputs
- File upload inputs

### Rich Text Editing
- WYSIWYG text editing capabilities
- Text formatting controls
- Inline text styling

### Accessibility Features
- Screen reader compatibility
- High contrast input themes
- Voice input support