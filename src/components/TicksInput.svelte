<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let steps;
    export let steppers;
    export let data = {};
    export let state = [];

    let ticks = [];

    function addTick(stepper, step) {
        ticks = [
            ...ticks,
            {
                step,
                stepper,
                data,
            }
        ];
    }

    function removeTick(stepper, step) {
        ticks = ticks.filter((tick) => {
            return (tick.step !== step) || (tick.stepper !== stepper);
        });
    }

    $: isTickSelected = function (stepper, step) {
        return !!ticks.find((tick) => {
            return (tick.step === step) && (tick.stepper === stepper);
        });
    }

    $: hasCursor = function (stepper, step) {
        return !!state.find((cursor) => {
            return (cursor.step === step) && (cursor.stepper === stepper);
        });
    }

    function toggleTick(stepper, step) {
        if(isTickSelected(stepper, step)) {
            removeTick(stepper, step);
        } else {
            addTick(stepper, step);
        };

        dispatch('change', ticks);
    }

    $: style = `grid-template-columns: repeat(${steps}, 1fr)`;
</script>

<div class="ticks-input" {style}>
    {#each Array(steppers) as _, i}
        {#each Array(steps) as _, j}
            <button
                class="tick-button"
                class:is-selected={isTickSelected(i, j)}
                class:has-cursor={hasCursor(i, j)}
                class:is-first-row={i === 0}
                class:is-last-row={i === steppers - 1}
                class:is-first-col={j === 0}
                class:is-last-col={j === steps - 1}
                on:click={() => toggleTick(i, j)}
            />
        {/each}
    {/each}
</div>

<style>
    .ticks-input {
        display: grid;
        border-radius: 20px;
        overflow: hidden;
        border: 2px solid #8a1c7c;
    }

    .tick-button {
        border: none;
        background: none;
        height: 0;
        padding-top: 100%;
        border: 1px solid #8a1c7c;
        cursor: pointer;
        transition: background-color 200ms ease-in;
    }

    .tick-button.has-cursor {
        background-color: #e7e8ff;
    }

    .tick-button.is-selected {
        background-color: #f0bcd4;
    }

    .tick-button.is-selected.has-cursor {
        background-color: #e990b9;
    }

    .tick-button.is-first-row {
        border-top: none;
    }

    .tick-button.is-last-row {
        border-bottom: none;
    }

    .tick-button.is-first-col {
        border-left: none;
    }

    .tick-button.is-last-col {
        border-right: none;
    }

    .tick-button:focus {
        outline: none;
    }
</style>