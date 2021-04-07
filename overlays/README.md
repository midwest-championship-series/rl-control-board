## scenes, i guess?
.scene files require the following format:

```json
{
    "show": {
        "event": string,
        "transition": boolean,
        "transition_rate": number,
        "delay": number
    },
    "hide": {
        "event": string,
        "transition": boolean,
        "transition_rate": number,
        "delay": number
    }
}
```
delay is in milliseconds, event is the trigger, and transition determines whether or not to play the transition. transition rate is defaulted to 1, > 1 is faster, < 1 is slower.

These .scene files get generated automatically, and need to be modified in the control board.

This data gets passed into the overlay (overlay.ejs) named as scenes.