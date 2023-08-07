import type { CustomEntry } from "../stores/custom"
import { Value, BinaryOperation, BinOp, UnaryOperation, UnOp, Node, Expression, type Database } from "./node"

function limitWidth(value: number, precision: number): string {
    let precise
    if (value - Math.round(value) === 0) {
        // Don't mess around with whole numbers
        precise = String(value)
    } else {
        precise = value.toPrecision(precision)

    }
    const normalLength = String(Number(precise)).length

    // Deal with it
    // (Actually I need to do this in case we took the if branch earlier)
    // (We don't want too many digits in exponential notation)
    const expLength = Number(Number(precise).toPrecision(precision)).toExponential().length

    if (normalLength < expLength) {
        return String(Number(precise))
    } else {
        return Number(Number(precise).toPrecision(precision)).toExponential()
    }
}

export function calculate(formulaString: string, targetUnitsString: string, database: Database, custom: CustomEntry[]): string {
    const output = parse(formulaString).evaluate(database, custom)

    if (targetUnitsString === "") {
        return limitWidth(output.value, 5) + (!output.isUnitless() ? ` ${output.units.standardString()}` : "")
    }

    const targetUnits = parse(targetUnitsString).evaluate(database, custom)

    if (!output.units.equals(targetUnits.units)) {
        throw new Error(`Can't convert ${output.units.standardString()} to ${targetUnits.units.standardString()}`)
    }

    const ratio = output.value / targetUnits.value
    return limitWidth(ratio, 5) + (targetUnitsString !== "" ? ` ${targetUnitsString}` : "")
}

export function parse(expression: string): Node {
    const tokens = tokenize(expression)
    const rootScope = createScopes(tokens)
    const sanitised = implicitMultiplication(detectAmbiguity(negativeExponent(rootScope)))
    return createSum(sanitised.reverse())
}

enum TokenType {
    Whitespace,
    Number,
    Function,
    Text,
    OpeningBracket,
    ClosingBracket,
    Operator,
    Scope,
}
class Token {
    type: TokenType
    content: null | string | number | Token[]
    hadWhiteSpaceBefore: boolean
    negExponentBypass: boolean

    constructor(type: TokenType, content: null | string | number | Token[]) {
        this.type = type
        this.content = content
        this.hadWhiteSpaceBefore = false
        this.negExponentBypass = false
    }
}

function tokenize(expression: string): Token[] {
    let tokens = []
    let token
    let lastWasWhitespace
    while (expression !== "") {
        [token, expression] = parseToken(expression)
        if (token.type !== TokenType.Whitespace) {
            if (lastWasWhitespace) {
                token.hadWhiteSpaceBefore = true
            }
            tokens.push(token)
        }
        lastWasWhitespace = (token.type === TokenType.Whitespace)
    }
    return tokens
}
function parseToken(expression: string): [Token, string] {
    if (expression.startsWith(" ")) {
        return [new Token(TokenType.Whitespace, null), expression.substring(1)]
    }

    if (expression.startsWith("(")) {
        return [new Token(TokenType.OpeningBracket, null), expression.substring(1)]
    }

    if (expression.startsWith(")")) {
        return [new Token(TokenType.ClosingBracket, null), expression.substring(1)]
    }

    const functionMatch = expression.match(/^(?<function>acosh|cosh|acos|cos|asinh|asenh|sinh|senh|asin|asen|sin|sen|atanh|tanh|tan|exp|ln|sqrt|log|abs|sign|sech|csch|coth|sec|csc|cot)(?<rest>.*)/)
    if (functionMatch !== null) {
        return [new Token(TokenType.Function, functionMatch.groups!.function), functionMatch.groups!.rest]
    }

    const numberMatch = expression.match(/^(?<number>\d+(\.\d+)?([eE][+-]?\d+)?)(?<rest>.*)$/)
    if (numberMatch !== null) {
        return [new Token(TokenType.Number, Number(numberMatch.groups!.number)), numberMatch.groups!.rest]
    }

    const textMatch = expression.match(/^(?<text>[a-zA-Z_0-9]+)(?<rest>.*)$/)
    if (textMatch !== null) {
        return [new Token(TokenType.Text, textMatch.groups!.text), textMatch.groups!.rest]
    }

    if (["+", "-", "*", "^", "/"].includes(expression[0])) {
        return [new Token(TokenType.Operator, expression[0]), expression.substring(1)]
    }

    throw new Error(`Unrecognized character in "${expression}"`)
}
function createScopes(tokens: Token[]): Token[] {
    let localScope = []
    let innerScope = []
    let depth = 0

    for (const token of tokens) {
        if (depth === 0) {
            if (token.type === TokenType.OpeningBracket) {
                depth++
            } else if (token.type === TokenType.ClosingBracket) {
                throw new Error("Missing opening bracket")
            } else {
                localScope.push(token)
            }
        } else {
            if (token.type === TokenType.OpeningBracket) {
                innerScope.push(token)
                depth++
            } else if (token.type === TokenType.ClosingBracket) {
                depth--
                if (depth === 0) {
                    localScope.push(new Token(TokenType.Scope, createScopes(innerScope)))
                    innerScope = []
                } else {
                    innerScope.push(token)
                }
            } else {
                innerScope.push(token)
            }
        }
    }
    if (depth !== 0) {
        throw new Error("Missing closing bracket")
    }
    if (innerScope.length !== 0) {
        localScope.push(new Token(TokenType.Scope, createScopes(innerScope)))
    }

    return localScope
}
function implicitMultiplication(tokens: Token[]): Token[] {
    let newScope = []
    let last = null

    for (const [i, token] of tokens.entries()) {
        if (last === null) {
            last = token
            continue
        }

        if (last.type === TokenType.Scope) {
            // @ts-ignore
            last.content = implicitMultiplication(last.content)
        }

        if (last.type === TokenType.Scope
            || last.type === TokenType.Number
            || last.type === TokenType.Text) {
                // Second element can be one of these:
                if (token.type === TokenType.Scope
                    || token.type === TokenType.Text) {
                        // Check if next is exponentiation
                        // We cannot "capture" the rightmost element
                        // since exponentiation wins over multiplication
                        if (i+1 < tokens.length
                            && tokens[i+1].type === TokenType.Operator
                            && tokens[i+1].content === "^") {
                                newScope.push(last)
                                newScope.push(new Token(TokenType.Operator, "*"))
                                last = token
                        // We won't create a scope either if the multiplication had whitespace
                        // This is to allow "2^2 m" or "1/2 m"
                        } else if (token.hadWhiteSpaceBefore) {
                            newScope.push(last)
                            newScope.push(new Token(TokenType.Operator, "*"))
                            last = token    
                        // Otherwise we can safely create a new scope
                        } else {
                            let innerScope: Token[] = [
                                last,
                                new Token(TokenType.Operator, "*"),
                                token
                            ]
                            // The chain can continue
                            last = new Token(TokenType.Scope, innerScope)
                        }
                // We will allow multiplying a scope with a number on the right
                // !!! negativeExponent relies on this behavior to work
                } else if (last.type === TokenType.Scope && token.type === TokenType.Number) {
                    let innerScope: Token[] = [
                        last,
                        new Token(TokenType.Operator, "*"),
                        token
                    ]
                    last = new Token(TokenType.Scope, innerScope)
                // We can also implicitly multiply a function (only from its left)
                // Similarly to exponents, we cannot capture the function
                } else if (token.type === TokenType.Function) {
                    newScope.push(last)
                    newScope.push(new Token(TokenType.Operator, "*"))
                    last = token
                // Implicit multiplication failed
                } else {
                    newScope.push(last)
                    last = token
                }    
        // Implicit multiplication failed
        } else {
            newScope.push(last)
            last = token
        }
    }

    if (last !== null) {
        if (last.type === TokenType.Scope) {
            // @ts-ignore
            last.content = implicitMultiplication(last.content)
        }
        newScope.push(last)
    }

    return newScope
}

// As of 6/8/2023, my parsing doesn't match MathJax's parsing
// in some edge cases. This is the quick fix (just throw an
// error in those cases)
function detectAmbiguity(tokens: Token[]): Token[] {
    let lastLast = null
    let last = null

    for (const token of tokens) {
        if (last === null) {
            last = token
            continue
        }

        if (lastLast === null) {
            lastLast = last
            last = token
            continue
        }

        if (token.type === TokenType.Scope) {
            // @ts-ignore
            detectAmbiguity(token.content)
        }

        // CASE I: "a^b^c"
        const lastLastExponentiation = (lastLast.type === TokenType.Operator
            && lastLast.content === "^")
        const lastIsExpression = (
            last.type === TokenType.Text
            || last.type === TokenType.Number
            || last.type === TokenType.Scope)
        const tokenExponentiation = (token.type === TokenType.Operator
            && token.content === "^")

        if (lastLastExponentiation && lastIsExpression && tokenExponentiation) {
            throw new Error("Ambiguous expression")
        }

        // CASE II: "1/2x" and "2^2x"
        const division = (lastLast.type === TokenType.Operator
            && lastLast.content === "/")
        const exponentiation = (lastLast.type === TokenType.Operator
            && lastLast.content === "^")

        if (!division && !exponentiation) {
            lastLast = last
            last = token
            continue
        }

        // Already declared
        /*const lastIsExpression = (
            last.type === TokenType.Text
            || last.type === TokenType.Number
            || last.type === TokenType.Scope)*/
        const tokenIsExpression = (
            token.type === TokenType.Text
            || token.type === TokenType.Number
            || token.type === TokenType.Scope)

        // If there was whitespace before, implicitMultiplication takes care
        // If the token was inserted by negativeExponent, it will bypass this check.
        // see: Token.negExponentBypass
        if (lastIsExpression && tokenIsExpression && !token.hadWhiteSpaceBefore && !last.negExponentBypass) {
            console.log(lastLast, last, token)
            throw new Error("Ambiguous expression")
        }

        lastLast = last
        last = token
    }

    return tokens
}

// Finds a sign right next to an exponent
// Otherwise the program thinks it's just a subtraction or addition and fails
// Inserts a "(-1)" or "(+1)" behind the scenes
function negativeExponent(tokens: Token[]): Token[] {
    let newScope = []
    let last = null

    for (const token of tokens) {
        if (last === null) {
            last = token
            continue
        }

        const lastIsPow = (last.type === TokenType.Operator
            && last.content === "^")
        const tokenIsSign = (token.type === TokenType.Operator
            && (token.content === "-"
            || token.content === "+"))

        if (tokenIsSign && lastIsPow) {
            newScope.push(last)
            let sign = token.content === "-" ? -1 : 1
            let value = new Token(TokenType.Number, sign)
            // We can't just leave the raw number because this relies
            // on implicit multiplication, and we can't do that
            // with two numbers
            last = new Token(TokenType.Scope, [value])
            // We must signal this so that no amibuguity is detected
            last.negExponentBypass = true
        } else {
            newScope.push(last)
            last = token
        }
    }

    if (last !== null) {
        newScope.push(last)
    }

    return newScope
}

// These functions assume the tokens array is already reversed.
function createSum(reversedTokens: Token[]): Node {
    let rightScope = []
    let leftScope = []
    let operator = null

    for (const token of reversedTokens) {
        if (operator === null) {
            if (token.type === TokenType.Operator) {
                if (token.content === "+") {
                    operator = BinOp.Add
                } else if (token.content === "-") {
                    operator = BinOp.Sub
                } else {
                    rightScope.push(token)
                }
            } else {
                rightScope.push(token)
            }
        } else {
            leftScope.push(token)
        }
    }
    if (rightScope.length === 0) {
        throw new Error("Missing operand")
    }
    let right = createMult(rightScope)

    if (operator === null) {
        return right
    }
    
    if (leftScope.length === 0) {
        leftScope.push(new Token(TokenType.Number, 0))
    }
    let left = createSum(leftScope)

    return new Node(new BinaryOperation(operator, left, right))
}
function createMult(reversedTokens: Token[]): Node {
    let rightScope = []
    let leftScope = []
    let operator = null

    for (const token of reversedTokens) {
        if (operator === null) {
            if (token.type === TokenType.Operator) {
                if (token.content === "*") {
                    operator = BinOp.Mul
                } else if (token.content === "/") {
                    operator = BinOp.Div
                } else {
                    rightScope.push(token)
                }
            } else {
                rightScope.push(token)
            }
        } else {
            leftScope.push(token)
        }
    }
    if (rightScope.length === 0) {
        throw new Error("Missing operand")
    }
    let right = createPow(rightScope.reverse())

    if (operator === null) {
        return right
    }
    
    if (leftScope.length === 0) {
        throw new Error("Missing operand")
    }
    let left = createMult(leftScope)

    return new Node(new BinaryOperation(operator, left, right))
}
function createPow(tokens: Token[]): Node {
    let rightScope = []
    let leftScope = []
    let operator = null

    for (const token of tokens) {
        if (operator === null) {
            if (token.type === TokenType.Operator && token.content === "^") {
                operator = BinOp.Pow
            } else {
                leftScope.push(token)
            }
        } else {
            rightScope.push(token)
        }
    }
    if (leftScope.length === 0) {
        throw new Error("Missing base")
    }
    let left = createFunc(leftScope.reverse())

    if (operator === null) {
        return left
    }
    
    if (rightScope.length === 0) {
        throw new Error("Missing operand")
    }
    let right = createPow(rightScope)

    return new Node(new BinaryOperation(operator, left, right))
}
function createFunc(reversedTokens: Token[]): Node {
    let argument = null

    for (const token of reversedTokens) {
        if (argument === null) {
            if (token.type === TokenType.Scope) {
                // @ts-ignore
                argument = createSum(token.content.reverse())
            } else if (token.type === TokenType.Number) {
                // @ts-ignore
                argument = new Node(new Value(token.content))
            } else if (token.type === TokenType.Text) {
                // @ts-ignore
                argument = new Node(new Expression(token.content))
            } else if (token.type === TokenType.Function) {
                throw new Error("Missing argument")
            } else {
                throw new Error("Unexpected error")
            }
        } else {
            if (token.type === TokenType.Function) {
                let func
                switch (token.content) {
                    case "cos": {
                        func = UnOp.Cos
                        break
                    }
                    case "sen":
                    case "sin": {
                        func = UnOp.Sin
                        break
                    }
                    case "tan": {
                        func = UnOp.Tan
                        break
                    }
                    case "exp": {
                        func = UnOp.Exp
                        break
                    }
                    case "ln": {
                        func = UnOp.Ln
                        break
                    }
                    case "log": {
                        func = UnOp.Log
                        break
                    }
                    case "sqrt": {
                        func = UnOp.Sqrt
                        break
                    }
                    case "cosh": {
                        func = UnOp.Cosh
                        break
                    }
                    case "senh":
                    case "sinh": {
                        func = UnOp.Sinh
                        break
                    }
                    case "tanh": {
                        func = UnOp.Tanh
                        break
                    }
                    case "acos": {
                        func = UnOp.Acos
                        break
                    }
                    case "asen":
                    case "asin": {
                        func = UnOp.Asin
                        break
                    }
                    case "atan": {
                        func = UnOp.Atan
                        break
                    }
                    case "acosh": {
                        func = UnOp.Acosh
                        break
                    }
                    case "asenh":
                    case "asinh": {
                        func = UnOp.Asinh
                        break
                    }
                    case "atanh": {
                        func = UnOp.Atanh
                        break
                    }
                    case "sec": {
                        func = UnOp.Sec
                        break
                    }
                    case "csc": {
                        func = UnOp.Csc
                        break
                    }
                    case "cot": {
                        func = UnOp.Cot
                        break
                    }
                    case "sech": {
                        func = UnOp.Sech
                        break
                    }
                    case "csch": {
                        func = UnOp.Csch
                        break
                    }
                    case "coth": {
                        func = UnOp.Coth
                        break
                    }
                    case "abs": {
                        func = UnOp.Abs
                        break
                    }
                    case "sign": {
                        func = UnOp.Sign
                        break
                    }
                    default: {
                        throw new Error(`"${token.content}" not implemented`)
                    }
                }
                return new Node(new UnaryOperation(func, argument))
            } else {
                throw new Error("Invalid syntax")
            }
        }
    }

    if (argument === null) {
        throw new Error("Missing value")
    }

    return argument
}
