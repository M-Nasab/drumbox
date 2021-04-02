<script>
    import TicksInput from './TicksInput.svelte';
    import { Djembe } from 'djembe';

    export let steps;
    export let steppers;
    export let data = {
        intensity: 'normal',
    };

    let ticks = [];
    let state = [];
    let interval = null;

    const intervalDuration = 100;
    const sound = '//OAxAAAAAAAAAAAAFhpbmcAAAAPAAAACQAABZcAGxsbGxsbGxsbGxtcXFxcXFxcXFxcXHJycnJycnJycnJyk5OTk5OTk5OTk5Ourq6urq6urq6ursnJycnJycnJycnJ5OTk5OTk5OTk5OT6+vr6+vr6+vr6+v//////////////AAAAOUxBTUUzLjk5cgJpAAAAACwsAAAUKCQEbUIAACgAAAWXfvUB2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zUMQAF4kOoANMWAIbnXXmZmZmZmJAkEwwMDA8WLDMzX2JAIACAAAEALAnAfjrJ5+//2MYxj3ve973vYxm977Ybm5ubg+D4EBAEDhQHz+CYPg+D5/UCAJ//3/4f/8QAg7xOD/wfP/D//4IKgAAgECi6SoUWzEGmdFZFLkDFCcohzD/86DEFkUMBp1HmsgBh6MFxYMYcSXtKoWAx0OkUYpwF2N99SQBJN1hrhoFmMqvAm6Z4NJFAUaWKJHQ+2F32H5KOVExJY4T5acyNOQ3VuKZD8X36mVyxx9KSGofgFqcHyNu78MifZueOUCUsYnIDj9+IWICkjpVasxDLtP+80zP2I/XjsSvw2/XIKn47R3oLrXa16pVlcol74am+7sxnWfeQTOUtHjlYhmKUk9eqWss8r8puU1u/UmZqJx6LXcqk1KY9bpbk9cp6t3k1PXZ3HutXo1Utfq7hzX7sVNY1ozQXd5fKqeeq832ryl/mWesLFq/fppV/O3t46+tvDWO7E7hd5ZmcKWrv/ys/O3VCQADAla7d/BB3vWgnhd8zVUSqfPaukYrocm4DWpzk0wMQjkjQCBELA3G8Coq//NAxC0hCwK2189AADa3HnKtMNRotSf6zx8zMXe0utWzt9Nwzbwq99VOhav87V6/pfoyVM+0N6PVTzDX6NE/UXXzzx9fXtUwv9bSl3cdsqFA0WDqhQgcKoJLNNAzjHTw7IELtaoYAIH/82DEAyAatp32w8o8ZNyXSD694JcBdmIiSPiUy2uUXY6rrt2txwUxhkqOtZgo9/9znyqp8Wqfr51CYQcSzGfjB7siHUNZhjizFcaZCx6FoWpVQiqUravOhnZSGcTdp7s1l/OSp2topDrSxidfsuR3+l7iLkAYRuxVZSVAAtFHaNR9cVj9mxAg110VFAcBhe3LtkDaDrKxRnrmSIz/81DEESBK+qY2eYUsLExKNzK5XxzwYHPYkpBzbbGRzOpGs1bJ2PLqGp2Bk/N3q2PBrnQw99uJZo/zNj4hCWafbS+MylLZN3n6Os9knZE2rIdN9zoqM/t+qLS7+rX8xKIQqWfSr2lZoNhw6OU4wprmPSFx3FLWhQ9qEYNepaoZk0AK//NQxAQdKPquXnmGzbdtu39nAazxXE9iP5lbGrSVIqGRMezcgmBUcWAbQL5U4/PA1PAMP9J/jUpWpNA4lglO2sTEnIKe/gkqJutG/3xW3caumbsb138d7pXuv8SSxLtFjf+v1/99fA3Zv9tjx/29996++sfNebvDDn9Qkv/dEKJAqv/zUMQEGrl2ojZ5hq79ySSECIolqFqq0GKT5Pe1mBV1g7zZRJBUs1ck7Eh2OjLtQsp1aDEltuVUlIz8+MxmqHzs7wlh5sKBoKrEs8t06VO5Y8PdIu2rLUlg7SgXMCIChR+Oe7kgWDpFrirolLXZbpV4iPfUAIZpZLMAvASz5080ZCH/80DEDhcBImBWewYcCTE1dwJh+ZocusmOF0RVLJ0ZRremVdgJmAhSkx+qxvVVCqv0v6qhXkSXUe/WdO8Su2Sqj3kVPDXrBWdI12qeRJYNHmHUeCv/7PiI8d+STEFNRTMuOTkuNaqqqv/zEMQNAAADSAAAAACqqqqqqqqqqqqqqqqq';

    const djembe = Djembe({
        steps,
        steppers,
        ticks,
    });

    djembe.subscribe(({ ticks, state: nextState }) => {
        state = nextState;
        playTicks(ticks);
    });

    function playTicks(ticks) {
        ticks.forEach(() => {
            const audio = new Audio( "data:audio/wav;base64," + sound );
            audio.play();
        })
    }

    function changeTicks({ detail: ticks }) {
        djembe.setTicks(ticks);
    }

    function playPause () {
        if (!interval) {
            clearInterval(interval);

            interval = setInterval(function() {
                djembe.tick();
            }, intervalDuration);
        } else {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        }
    }
</script>

<div class="music-box">
    <div class="ticks-input-container">
        <TicksInput
            {steps}
            {steppers}
            {data}
            {state}
            on:change={changeTicks}
        />
    </div>
    <div class="controls">
        <button class="play-pause-btn" on:click={playPause}>
            {#if !interval}
                play
            {:else}
                stop
            {/if}
        </button>
    </div>
</div>

<style>
    .ticks-input-container {
        margin-bottom: 10px;
    }

    .controls {
        display: flex;
        align-items: center;
        justify-content: space-around;
    }

    .play-pause-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 10px;
        border-radius: 6px;
        background-color: #8d407c;
        color: #fff;
        font-size: 16px;
        font-weight: bold;
    }
</style>