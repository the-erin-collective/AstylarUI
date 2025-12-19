import { Injectable } from '@angular/core';
import { InputElement, ValidationRule, ValidationResult, ValidationRuleType } from '../../../types/input-types';

/**
 * Service responsible for validating input values
 */
@Injectable({
    providedIn: 'root'
})
export class FormValidatorService {
    /**
     * Validates an input element against its validation rules
     */
    validateInput(inputElement: InputElement): ValidationResult {
        const errors: string[] = [];

        for (const rule of inputElement.validationRules) {
            if (!this.validateRule(inputElement.value, rule)) {
                errors.push(rule.message);
            }
        }

        const result: ValidationResult = {
            valid: errors.length === 0,
            errors
        };

        // Update input validation state
        inputElement.validationState.valid = result.valid;
        inputElement.validationState.errors = result.errors;

        return result;
    }

    /**
     * Validates a value against a specific rule
     */
    validateRule(value: any, rule: ValidationRule): boolean {
        switch (rule.type) {
            case 'required':
                return this.validateRequired(value);

            case 'minLength':
                return this.validateMinLength(value, rule.value);

            case 'maxLength':
                return this.validateMaxLength(value, rule.value);

            case 'email':
                return this.validateEmail(value);

            case 'pattern':
                return this.validatePattern(value, rule.value);

            case 'number':
                return this.validateNumber(value);

            case 'custom':
                return this.validateCustom(value, rule.validator);

            default:
                return true;
        }
    }

    /**
     * Validates required field
     */
    private validateRequired(value: any): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (typeof value === 'boolean') return true; // Checkboxes can be false
        return true;
    }

    /**
     * Validates minimum length
     */
    private validateMinLength(value: any, minLength: number): boolean {
        if (typeof value !== 'string') return true;
        return value.length >= minLength;
    }

    /**
     * Validates maximum length
     */
    private validateMaxLength(value: any, maxLength: number): boolean {
        if (typeof value !== 'string') return true;
        return value.length <= maxLength;
    }

    /**
     * Validates email format
     */
    private validateEmail(value: any): boolean {
        if (typeof value !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    }

    /**
     * Validates against regex pattern
     */
    private validatePattern(value: any, pattern: string | RegExp): boolean {
        if (typeof value !== 'string') return false;
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        return regex.test(value);
    }

    /**
     * Validates numeric value
     */
    private validateNumber(value: any): boolean {
        if (typeof value === 'number') return !isNaN(value);
        if (typeof value === 'string') {
            const num = parseFloat(value);
            return !isNaN(num);
        }
        return false;
    }

    /**
     * Validates using custom validator function
     */
    private validateCustom(value: any, validator?: (value: any) => boolean): boolean {
        if (!validator) return true;
        try {
            return validator(value);
        } catch (error) {
            console.error('Custom validator error:', error);
            return false;
        }
    }

    /**
     * Adds a validation rule to an input element
     */
    addValidationRule(inputElement: InputElement, rule: ValidationRule): void {
        if (!inputElement.validationRules.includes(rule)) {
            inputElement.validationRules.push(rule);
        }
    }

    /**
     * Removes a validation rule from an input element
     */
    removeValidationRule(inputElement: InputElement, ruleType: ValidationRuleType): void {
        inputElement.validationRules = inputElement.validationRules.filter(r => r.type !== ruleType);
    }

    /**
     * Clears all validation rules from an input element
     */
    clearValidationRules(inputElement: InputElement): void {
        inputElement.validationRules = [];
        inputElement.validationState.valid = true;
        inputElement.validationState.errors = [];
    }

    /**
     * Creates a required validation rule
     */
    createRequiredRule(message: string = 'This field is required'): ValidationRule {
        return {
            type: 'required',
            message
        };
    }

    /**
     * Creates a min length validation rule
     */
    createMinLengthRule(minLength: number, message?: string): ValidationRule {
        return {
            type: 'minLength',
            value: minLength,
            message: message || `Minimum length is ${minLength} characters`
        };
    }

    /**
     * Creates a max length validation rule
     */
    createMaxLengthRule(maxLength: number, message?: string): ValidationRule {
        return {
            type: 'maxLength',
            value: maxLength,
            message: message || `Maximum length is ${maxLength} characters`
        };
    }

    /**
     * Creates an email validation rule
     */
    createEmailRule(message: string = 'Please enter a valid email address'): ValidationRule {
        return {
            type: 'email',
            message
        };
    }

    /**
     * Creates a pattern validation rule
     */
    createPatternRule(pattern: string | RegExp, message: string): ValidationRule {
        return {
            type: 'pattern',
            value: pattern,
            message
        };
    }

    /**
     * Creates a custom validation rule
     */
    createCustomRule(validator: (value: any) => boolean, message: string): ValidationRule {
        return {
            type: 'custom',
            validator,
            message
        };
    }
}
