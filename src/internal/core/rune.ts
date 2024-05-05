/**
 * A rune is a single character in a string. It is a 32-bit integer that represents a Unicode code point.
 */
export class rune {
    private _value: number;

    constructor(value: number) {
        this._value = value;
    }

    /**
     * Creates a new rune from a single character string
     * @param s A single character string
     * @returns A rune
     */
    static fromString(s: string): rune {
        if(s.length > 1) {
            throw new Error("Cannot create a rune from a string with more than one character");
        }
        return new rune(s.charCodeAt(0));
    }

    /**
     * Returns the value of the rune
     */
    get toString(): string {
        return String.fromCharCode(this._value);
    }

    /**
     * Returns the value of the rune
     */
    get value(): number {
        return this._value;
    }

    /**
     * Returns if two runes are equal
     */
    equals(r: rune): boolean {
        return this._value == r._value;
    }
}