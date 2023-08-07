//https://dev.to/danawoodman/svelte-quick-tip-connect-a-store-to-local-storage-4idi
import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { Units, Value } from "$lib/node";

export interface CustomEntry {
    id: number
    error: boolean
    description: string
    text: string
    formula: string
    value?: Value
}

let savedValues: CustomEntry[]
if (!browser || localStorage.getItem("values") === null) {
    savedValues = []
} else {
    savedValues = JSON.parse(localStorage.getItem("values")!)
    for (const savedValue of savedValues) {
        if (!savedValue.error) {
            // We need the methods! Or prototypes. Or however JS works...
            const saved = savedValue.value!
            // @ts-ignore
            const exponents = new Map(Object.entries(saved.units))
            const units = new Units(exponents)
            savedValue.value = new Value(saved.value, units)
        } else {
            savedValue.value = undefined
        }
    }
}
export const custom = writable(savedValues)
if (browser) {
    custom.subscribe((values) => {
        const string = JSON.stringify(values.map((v) => {
            if (v.value) {
                return {...v, value: JSON.parse(JSON.stringify(v.value))}
            } else {
                return v
            }
        }))
        localStorage.setItem("values", string)
    })
}
