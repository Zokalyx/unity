//https://dev.to/danawoodman/svelte-quick-tip-connect-a-store-to-local-storage-4idi
import { writable } from "svelte/store";
import { browser } from "$app/environment";

interface Entry {
    id: number
    formula: string
    output: string
}

let savedHistory: Entry[]
if (!browser || localStorage.getItem("history") === null) {
    savedHistory = []
} else {
    savedHistory = JSON.parse(localStorage.getItem("history")!)
}
export const history = writable(savedHistory)
if (browser) {
    history.subscribe((value) => localStorage.setItem("history", JSON.stringify(value)))
}
