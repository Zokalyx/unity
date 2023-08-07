<script lang="ts">
    import { calculate } from "$lib/parse";
    import data from "$lib/database.json";
    import { load } from "$lib/load";
    import { fade, fly } from "svelte/transition";
    import { flip } from "svelte/animate";
    import { parse } from "$lib/parse";
    import Logo from "../lib/logo.svelte";
    import { history } from "../stores/history";
    import { custom } from "../stores/custom";
    import { onMount } from "svelte";

    let text = "";
    let outputUnit = "";
    let output = "";
    let outputError = "";
    let database = load(data);

    onMount(() => {
        // @ts-ignore
        window.clearHistory = () => {
            $history = [];
        };
        // @ts-ignore
        window.clearValues = () => {
            $custom = [];
        };
        // @ts-ignore
        window.showCustom = () => {
            return $custom
        }
    });

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key !== "Enter") {
            return;
        }

        if (outputError !== "") {
            return;
        }

        if (
            $history.length !== 0 &&
            $history[0].formula === text &&
            $history[0].output === output
        ) {
            return;
        }

        $history = [
            {
                id: $history.length,
                formula: text,
                output: output,
            },
            ...$history,
        ];
    }

    function createCustom() {
        let newIndex;
        if ($custom.length === 0) {
            newIndex = 0;
        } else {
            newIndex = $custom[0].id + 1;
        }
        $custom = [
            {
                id: newIndex,
                error: true,
                description: "",
                text: "",
                formula: "",
            },
            ...$custom,
        ];
    }

    $: if (text === "") {
        output = "";
        outputError = "";
    } else {
        try {
            output = calculate(text, outputUnit, database, $custom);
            outputError = "";
        } catch (error: any) {
            output = "";
            outputError = error.message;
        }
    }
</script>

<div
    class="main bg-gradient-to-tr from-blue-800 to-red-500 h-screen flex flex-col items-center justify-evenly"
>
    <a class="group absolute left-[2vh] top-[2vh] w-[10vh] h-[10vh]" href="https://github.com/zokalx/unity">
        <div class="z-10 opacity-80 absolute inset-0">
            <Logo />
        </div>
        <div class="z-5 bg-white rounded-full opacity-0 transition group-hover:opacity-80 group-hover:drop-shadow-xl w-[11vh] h-[11vh] absolute left-[-0.5vh] top-[-0.5vh] border-white border-[1vh] border-opacity-100">
            
        </div>
        <div class="z-1 w-[150%] absolute inset-0 text text-white top-[31%] left-[10%] opacity-0 group-hover:opacity-80 transition-all group-hover:left-[120%]">
            <span class="text-2xl">Unity</span><br><span class="text-sm">by Fran</span>
        </div>
    </a>
    <div
        class="z-10 h-[30%] flex flex-col-reverse flex-nowrap overflow-scroll no-scrollbar topfade"
    >
        {#each $history as entry (entry.id)}
            <div
                class="w-[130vh] max-w-[100vw] flex place-content-between items-center m-2"
                in:fly={{ y: 20 }}
                animate:flip={{ duration: 400 }}
            >
                <input
                    class="rounded-2xl text-sm cursor-text selection:bg-sky-300 w-[60%] py-2 px-4 bg-white/60 drop-shadow-lg placeholder:text-center placeholder:text-black placeholder:opacity-50 transition hover:bg-white/70 hover:drop-shadow-xl focus:drop-shadow-2xl focus:bg-white/90 focus:placeholder:opacity-0 outline-none"
                    autocomplete="off"
                    type="text"
                    placeholder="formula"
                    disabled
                    value={entry.formula}
                />
                <span class="text-white -z-10">=</span>
                <input
                    class="rounded-2xl text-sm cursor-text selection:bg-sky-300 w-[35%] py-2 px-4 bg-white/60 drop-shadow-lg placeholder:text-center placeholder:text-black placeholder:opacity-50 transition hover:bg-white/70 hover:drop-shadow-xl focus:drop-shadow-2xl focus:bg-white/90 focus:placeholder:opacity-0 outline-none"
                    autocomplete="off"
                    type="text"
                    placeholder="formula"
                    disabled
                    value={entry.output}
                />
            </div>
        {/each}
        {#if $history.length === 0}
            <span class="text-center m-2 text-white/80"
                >Press enter to save the calculation</span
            >
        {/if}
        <!-- Needed to see the first entry well -->
        <div class="text-transparent">asd</div>
    </div>

    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="z-10 h-[15%] flex flex-col items-center"
        on:keydown={handleKeyDown}
    >
        <div
            class="w-[160vh] max-w-[100vw] flex place-content-between items-center m-2"
        >
            <input
                id="demoSource"
                class="rounded-2xl text-base selection:bg-sky-300 w-[50%] py-3 px-4 bg-white/75 drop-shadow-lg placeholder:text-center placeholder:text-black placeholder:opacity-50 transition hover:bg-white/85 hover:drop-shadow-xl focus:drop-shadow-2xl focus:bg-white/90 focus:placeholder:opacity-0 outline-none"
                autocomplete="off"
                type="text"
                placeholder="formula"
                bind:value={text}
            />
            <input
                type="text"
                class="rounded-2xl text-base selection:bg-sky-300 w-[15%] py-3 px-4 bg-white/75 drop-shadow-lg placeholder:text-center placeholder:text-black placeholder:opacity-50 transition hover:bg-white/85 hover:drop-shadow-xl focus:drop-shadow-2xl focus:bg-white/90 focus:placeholder:opacity-0 outline-none"
                autocomplete="off"
                placeholder="expressed in"
                bind:value={outputUnit}
            />
            <span class="text-white"> = </span>
            <input
                type="text"
                class="rounded-2xl hover:cursor-text text-base selection:bg-sky-300 w-[30%] py-3 px-4 bg-white/75 drop-shadow-lg placeholder:text-center placeholder:text-black placeholder:opacity-50 transition hover:bg-white/85 hover:drop-shadow-xl focus:drop-shadow-2xl focus:bg-white/90 focus:placeholder:opacity-0 outline-none"
                placeholder="result"
                disabled
                bind:value={output}
            />
        </div>
        <div
            class="text-white w-[160vh] max-w-[100vw] flex place-content-between items-center h-[5vh] m-2"
        >
            <div
                class="py-2 px-4 text-center w-[50%]"
                class:hidden={outputError !== ""}
                id="demoRendering"
            >
                <script type="math/asciimath" id="MathJax-Element-1"></script>
            </div>
            <div
                class="py-2 px-4 text-center w-[50%]"
                class:hidden={outputError === ""}
            >
                {outputError}
            </div>
        </div>
    </div>

    <div class="z-10 h-[50%] flex items-start justify-between w-[140vh]">
        <div
            class="z-10 w-[65vh] flex flex-col flex-nowrap overflow-scroll no-scrollbar items-center h-full botfade"
        >
            <span class="text-xl text-white m-2">Units and constants</span>
            {#each database.units as [name, unit]}
                <div class="w-full flex items-center justify-between m-1">
                    <span class="text-white text-sm"
                        >{name} - {unit.description}</span
                    >
                    <input
                        type="text"
                        class="rounded-2xl hover:cursor-text text-sm selection:bg-sky-300 w-[50%] py-2 px-4 bg-white/60 drop-shadow-lg placeholder:text-center placeholder:text-black placeholder:opacity-50 transition hover:bg-white/75 hover:drop-shadow-xl focus:drop-shadow-2xl focus:bg-white/90 focus:placeholder:opacity-0 outline-none"
                        placeholder="result"
                        disabled
                        value={unit.value.display()}
                    />
                </div>
            {/each}
            <hr class="border-[1px] w-[100%] opacity-50 my-2">
            {#each database.constants as [name, constant]}
                <div class="w-full flex items-center justify-between m-1">
                    <span class="text-white text-sm"
                        >{name} - {constant.description}</span
                    >
                    <input
                        type="text"
                        class="rounded-2xl hover:cursor-text text-sm selection:bg-sky-300 w-[50%] py-2 px-4 bg-white/60 drop-shadow-lg placeholder:text-center placeholder:text-black placeholder:opacity-50 transition hover:bg-white/75 hover:drop-shadow-xl focus:drop-shadow-2xl focus:bg-white/90 focus:placeholder:opacity-0 outline-none"
                        placeholder="result"
                        disabled
                        value={constant.value.display()}
                    />
                </div>
            {/each}
            <!-- Needed to see the first entry well -->
            <div class="text-transparent">asd</div>
        </div>

        <div
            class="z-10 w-[65vh] flex flex-col flex-nowrap overflow-scroll no-scrollbar items-center h-full botfade"
        >
            <div class="w-full flex items-center justify-center m-1">
                <span class="text-xl text-white m-2">Your values</span>
                <button
                    type="button"
                    on:click={createCustom}
                    class="text-black m-2 rounded-full bg-white/80 w-5 h-5 transition hover:bg-white"
                >
                    <span class="text-center bottom-[0.15rem] relative">
                        +
                    </span>
                </button>
            </div>
            {#each $custom as val (val.id)}
                <div
                    in:fly={{ y: -20 }}
                    out:fade={{ duration: 150 }}
                    animate:flip={{ duration: 400 }}
                    class="w-full flex items-center justify-between m-1"
                >
                    <input
                        type="text"
                        placeholder="name"
                        bind:value={val.text}
                        class="bg-transparent text-white placeholder:text-center placeholder:text-white placeholder:text-opacity-50 py-2 px-4 border-b-white/60 border-b-2 w-[30%] round mx-2 transition hover:border-b-white/75 focus:border-b-white/90 outline-none"
                    />
                    <div class="flex w-[60%] p-0 m-0">
                        <input
                            type="text"
                            class="rounded-2xl hover:cursor-text text-sm selection:bg-sky-300 w-[80%] py-2 px-4 bg-white/60 drop-shadow-lg placeholder:text-center placeholder:text-black placeholder:opacity-50 transition hover:bg-white/75 hover:drop-shadow-xl focus:drop-shadow-2xl focus:bg-white/90 focus:placeholder:opacity-0 outline-none"
                            placeholder="expression"
                            bind:value={val.formula}
                            on:input={() => {
                                try {
                                    if (val.text === "" || val.formula === "") {
                                        val.error = true;
                                        val.value = undefined;
                                        return;
                                    }
                                    val.value = parse(val.formula).evaluate(
                                        database, $custom
                                    );
                                    val.error = false;
                                } catch (error) {
                                    val.value = undefined;
                                    // @ts-ignore
                                    val.error = error.message;
                                }
                            }}
                        />
                        <button
                            type="button"
                            on:click={() => {
                                $custom = $custom.filter(
                                    (v) => v.id !== val.id
                                );
                            }}
                            class="text-black m-2 rounded-full bg-white/80 w-5 h-5 transition hover:bg-white"
                        >
                            <span class="text-center bottom-[0.15rem] relative">
                                -
                            </span>
                        </button>
                    </div>
                </div>
            {/each}
            <!-- Needed to see the first entry well -->
            <div class="text-transparent">asd</div>
        </div>
    </div>
</div>

<style>
    .hidden {
        display: none;
    }

    /* Grainy background */
    .main:before {
        content: "";
        background-color: transparent;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E");
        background-repeat: round;
        background-size: 200px;
        opacity: 0.5;
        top: 0;
        left: 0;
        position: absolute;
        width: 100%;
        height: 100%;
        mix-blend-mode: color-burn;
    }

    /* Hide scrollbar for Chrome, Safari and Opera */
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }

    /* Hide scrollbar for IE, Edge and Firefox */
    .no-scrollbar {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
    }

    .topfade {
        mask-image: linear-gradient(to top, black 80%, transparent 95%);
    }

    .botfade {
        mask-image: linear-gradient(to bottom, black 80%, transparent 95%);
    }
</style>
