import { Value, Units, type Database, type FullValue } from "./node";

export function load(data: any): Database {
    let unitsData: Map<string, FullValue> = new Map()
    for (const value of data.units) {
        let exponents = new Map()
        for (const base in value.exponents) {
            exponents.set(base, value.exponents[base])
        }
        let units = new Units(exponents)

        unitsData.set(value.text, {
            value: new Value(value.multiplier, units),
            description: value.description,
        })
    }

    let constants: Map<string, FullValue> = new Map()
    for (const value of data.constants) {
        let exponents = new Map()
        for (const base in value.exponents) {
            exponents.set(base, value.exponents[base])
        }
        let units = new Units(exponents)

        constants.set(value.text, {
            value: new Value(value.multiplier, units),
            description: value.description
        })
    }

    let prefixes = new Map()
    for (const prefix of data.prefixes) {
        prefixes.set(prefix.text, prefix.value)
    }

    return {
        units: unitsData,
        prefixes: prefixes,
        constants: constants,
    } as Database
}
