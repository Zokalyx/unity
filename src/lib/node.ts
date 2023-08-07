import type { CustomEntry } from "../stores/custom"

export interface FullValue {
    value: Value
    description: string
}

export interface Database {
    prefixes: Map<string, number>
    units: Map<string, FullValue>
    constants: Map<string, FullValue>
}

export class Value {
    value: number
    units: Units

    constructor(value: number, units?: Units) {
        this.value = value

        if (units === undefined) {
            this.units = new Units(new Map())
        } else {
            this.units = units
        }
    }

    evaluate(database: Database) {
        return this
    }

    isUnitless(): boolean {
        return this.units.isUnitless()
    }

    stringify(): string {
        return JSON.stringify({
            value: this.value,
            units: this.units.stringify()
        })
    }

    display() {
        let valueRepresentation
        if (this.value === 1) {
            valueRepresentation = this.value
        } else {
            valueRepresentation = this.value.toExponential()
        }
        return `${valueRepresentation} ${this.units.standardString()}`
    }
}
export class Units {
    private exponents: Map<string, number>

    static bases = ["kg", "m", "s", "A", "K", "mol", "cd"]

    constructor(exponents: Map<string, number>) {
        this.exponents = exponents
    }

    getExponent(base: string) {
        return this.exponents.has(base) ? this.exponents.get(base)! : 0
    }

    isUnitless(): boolean {
        for (const base of Units.bases) {
            if (this.getExponent(base) !== 0) {
                return false
            }
        }
        return true
    }

    stringify(): string {
        return JSON.stringify(this.exponents)
    }

    equals(other: Units): boolean {
        for (const base of Units.bases) {
            const lhs = this.getExponent(base)
            const rhs = other.getExponent(base)
            if (lhs !== rhs) {
                return false
            }
        }

        return true
    }

    add(other: Units): Units {
        const exponents = new Map()
        for (const base of Units.bases) {
            const lhs = this.getExponent(base)
            const rhs = other.getExponent(base)
            const sum = lhs + rhs
            if (sum !== 0) {
                exponents.set(base, sum)
            }
        }

        return new Units(exponents)
    }

    mul(scalar: number): Units {
        const exponents = new Map()
        for (const base of Units.bases) {
            const exponent = this.getExponent(base)
            const prod = exponent * scalar
            if (prod !== 0) {
                exponents.set(base, prod)
            }
        }

        return new Units(exponents)
    }

    standardString(): string {
        return Units.bases
            .filter((base: string) => this.getExponent(base) !== 0)
            .map((base: string) => base + (this.getExponent(base) !== 1 ? ("^" + this.getExponent(base)) : ""))
            .join(" ")
    }
}

export enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    Pow,
}
export class BinaryOperation {
    private op: BinOp
    private left: Node
    private right: Node

    constructor(op: BinOp, left: Node, right: Node) {
        this.op = op
        this.left = left
        this.right = right
    }

    evaluate(database: Database, custom: CustomEntry[]) {
        const left = this.left.evaluate(database, custom)
        const right = this.right.evaluate(database, custom)

        switch (this.op) {
            case BinOp.Add: {
                if (!left.units.equals(right.units)) {
                    throw new Error(`Can't add ${left.units.standardString() !== "" ? left.units.standardString() : 'a unitless value'} and ${right.units.standardString()}`)
                }
                return new Value(left.value + right.value, left.units)
            }
            case BinOp.Sub: {
                if (!left.units.equals(right.units)) {
                    throw new Error(`Can't subtract ${left.units.standardString()} and ${right.units.standardString()}`)
                }
                return new Value(left.value - right.value, left.units)
            }
            case BinOp.Mul: {
                return new Value(left.value * right.value, left.units.add(right.units))
            }
            case BinOp.Div: {
                return new Value(left.value / right.value, left.units.add(right.units.mul(-1)))
            }
            case BinOp.Pow: {
                if (!right.isUnitless()) {
                    throw new Error(`Exponent must have no units (instead of ${right.units.standardString()})`)
                }
                return new Value(Math.pow(left.value, right.value), left.units.mul(right.value))
            }
        }
    }
}

export enum UnOp {
    Cos,
    Sin,
    Tan,
    Exp,
    Log,
    Ln,
    Sqrt,
    Cosh,
    Sinh,
    Tanh,
    Acos,
    Asin,
    Atan,
    Acosh,
    Asinh,
    Atanh,
    Sec,
    Csc,
    Cot,
    Sech,
    Csch,
    Coth,
    Abs,
    Sign,
}
export class UnaryOperation {
    private op: UnOp
    private arg: Node

    constructor(op: UnOp, arg: Node) {
        this.op = op
        this.arg = arg
    }

    evaluate(database: Database, custom: CustomEntry[]): Value {
        const arg = this.arg.evaluate(database, custom)

        switch (this.op) {
            case UnOp.Cos: {
                if (!arg.isUnitless()) {
                    throw new Error(`Cosine argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.cos(arg.value))
            }
            case UnOp.Sin: {
                if (!arg.isUnitless()) {
                    throw new Error(`Sine argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.sin(arg.value))
            }
            case UnOp.Tan: {
                if (!arg.isUnitless()) {
                    throw new Error(`Tangent argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.tan(arg.value))
            }
            case UnOp.Exp: {
                if (!arg.isUnitless()) {
                    throw new Error(`Exponent must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.exp(arg.value))
            }
            case UnOp.Log: {
                if (!arg.isUnitless()) {
                    throw new Error(`Logarithm argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.log10(arg.value))
            }
            case UnOp.Ln: {
                if (!arg.isUnitless()) {
                    throw new Error(`Logarithm argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.log(arg.value))
            }
            case UnOp.Acos: {
                if (!arg.isUnitless()) {
                    throw new Error(`Inverse cosine argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.acos(arg.value))
            }
            case UnOp.Asin: {
                if (!arg.isUnitless()) {
                    throw new Error(`Inverse sine argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.asin(arg.value))
            }
            case UnOp.Atan: {
                if (!arg.isUnitless()) {
                    throw new Error(`Inverse tangent argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.atan(arg.value))
            }
            case UnOp.Cosh: {
                if (!arg.isUnitless()) {
                    throw new Error(`Hyperbolic cosine argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.cosh(arg.value))
            }
            case UnOp.Sinh: {
                if (!arg.isUnitless()) {
                    throw new Error(`Hyperbolic sine argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.sinh(arg.value))
            }
            case UnOp.Tanh: {if (!arg.isUnitless()) {
                    throw new Error(`Hyperbolic tangent argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.tanh(arg.value))
            }
            case UnOp.Acosh: {if (!arg.isUnitless()) {
                    throw new Error(`Inverse hyperbolic cosine argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.acosh(arg.value))
            }
            case UnOp.Atanh: {if (!arg.isUnitless()) {
                    throw new Error(`Inverse hyperbolic tangent argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.atanh(arg.value))
            }
            case UnOp.Asinh: {if (!arg.isUnitless()) {
                    throw new Error(`Inverse hyperbolic sine argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(Math.asinh(arg.value))
            }
            case UnOp.Sec: {if (!arg.isUnitless()) {
                    throw new Error(`Secant argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(1 / Math.cos(arg.value))
            }
            case UnOp.Csc: {if (!arg.isUnitless()) {
                    throw new Error(`Cosecant argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(1 / Math.sin(arg.value))
            }
            case UnOp.Cot: {if (!arg.isUnitless()) {
                    throw new Error(`Cotangent argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(1 / Math.tan(arg.value))
            }
            case UnOp.Sech: {if (!arg.isUnitless()) {
                    throw new Error(`Hyperbolic secant argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(1 / Math.cosh(arg.value))
            }
            case UnOp.Csch: {if (!arg.isUnitless()) {
                    throw new Error(`Hyperbolic cosecant argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(1 / Math.sinh(arg.value))
            }
            case UnOp.Coth: {if (!arg.isUnitless()) {
                    throw new Error(`Hyperbolic cotangent argument must have no units (instead of ${arg.units.standardString()})`)
                }
                return new Value(1 / Math.tanh(arg.value))
            }
            case UnOp.Abs: {
                return new Value(Math.abs(arg.value), arg.units)
            }
            case UnOp.Sign: {
                return new Value(Math.sign(arg.value), arg.units)
            }
            case UnOp.Sqrt: {
                return new Value(Math.sqrt(arg.value), arg.units.mul(0.5))
            }
        }
        throw new Error(`Invalid operation ${this.op}`)
    }
}

export class Expression {
    text: string

    constructor(text: string) {
        this.text = text
    }

    evaluate(database: Database, custom: CustomEntry[]): Value {
        for (const customEntry of custom) {
            if (!customEntry.error && customEntry.text === this.text) {
                return customEntry.value!
            }
        }

        if (database.constants.has(this.text)) {
            return database.constants.get(this.text)!.value
        }
        
        // Start testing the end of the string, reducing the length each time
        let prefix = null
        let value = null
        let isUnit = false
        for (let i = 0; i < this.text.length; i++) {
            const guess = this.text.substring(i)
            if (database.units.has(guess)) {
                value = database.units.get(guess)!
                prefix = this.text.substring(0, i)
                isUnit = true
                break
            }
        }
        if (value === null) {
            throw new Error(`Unknown value "${this.text}"`)
        }

        if (prefix === null || prefix === "") {
            return value.value
        } else {
            let multiplier
            if (database.prefixes.has(prefix)) {
                multiplier = database.prefixes.get(prefix)!
            } else {
                throw new Error(`Unknown prefix "${prefix}-"`)
            }
            // lmao
            return new Value(value.value.value * multiplier, value.value.units)
        }
    }
}

export class Node {
    private content: UnaryOperation | BinaryOperation | Value | Expression

    constructor(content: UnaryOperation | BinaryOperation | Value | Expression) {
        this.content = content
    }

    evaluate(database: Database, custom: CustomEntry[]): Value {
        return this.content.evaluate(database, custom)
    }
}
