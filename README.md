# Lights Out!

Dad wants the brightest house on the block. Keep his Christmas lights burning till midnight: bulbs
flicker and die, and a dead bulb's dark creeps along the strand toward the plug. Let it get there
and the whole strand goes out. A Fun Shed game, a Tapper-style arcade game played sideways, with a
dad who is definitely not anyone from a certain 1989 Christmas movie.

Plain HTML and JavaScript with [Phaser 3.90](https://phaser.io) saved in `vendor/`. There is no
build step, it installs on phones as an app, and it plays offline. Built the same way as Feed the
Chickens (`../feed-the-chickens`) and Fruitcake Flingers (`../family-holiday-game`).

## Run it on a computer

```
python3 tools/serve.py
```

The screen is 540 tall and as wide as the phone (16:9 up to about 2.2:1), so long phones get a
wider house instead of empty bars. Open http://127.0.0.1:8796 (or `http://<this computer's address>:8796` on a phone on the home
network) and click where you'd tap. Extras in the address:

- `?debug` outlines every bulb's tap area, the rows Dad stands on, the box and the switch.
- `?night=2` starts on night 2.

On localhost and plain http the offline cache is switched off, so edits show up on a reload
(the server tells browsers not to keep a copy, so a reload is enough).

## How to play

- **First time:** swipe in your three initials, arcade style.
- **Title:** swipe up (or tap) to play, down for the high scores.
- **Each night** opens with a card: the night, the strands up tonight, and a tip.
- **The big moment:** drumroll, plug in... nothing. Tap the switch on the garage and the lights come on.
- **Then:**
  - a **blinking** bulb is burning out. It blinks faster and faster as it gets close, so the
    fastest blinker is the one to get to first. **Tap near it** (it doesn't have to be right on it)
    and Dad goes and swaps it. Saving one in its last moments is a CLOSE CALL.
  - too slow and it **pops** and goes black: **a heart lost**, like a missed mug in Tapper. The
    popped bulb comes back on by itself a moment later.
  - now and then a **candy cane** hangs on the lights for 8 seconds (it blinks before it goes).
    Tap it and Dad grabs it: +50, and **every 5 candy canes is a heart back**. With the hearts
    already full, the 5th is worth 250 instead. The count (top of the screen) carries over
    from night to night.
  - **swipe up or down** to climb, **sideways** to run to the end of the row.
  - tap the **bulb box** to refill his bag (the count is top left).
  - from night 2, **Grandma** comes to the upstairs window nearest Dad whenever he's up the ladder.
    When a curtain twitches, get away from that window: she flings it open yelling BURGLAR and
    whacks him off the ladder with her rolling pin (he lies in the snow seeing stars for a moment).
    Out of her reach, she throws her slipper at where he is: keep moving and it's DODGED, +50.
  - now and then the kid wanders over. He doesn't help.
- You start with 5 hearts, and 5 is the most you can have. Lose them all and it's game over.
- At **midnight** every burning bulb is worth 5. A night with no bulb popped is a PERFECT NIGHT:
  250 more.
- **II** (top left) pauses: KEEP PLAYING, or QUIT. The phone's back gesture and switching apps pause too.
- **After a game:** swipe up to play again, down for the high scores, left (or TRASH TALK) to text
  your score with a dare link, right for the menu.

## How it gets harder

The same house every night, with one more strand up and something new:

| Night | Strands | What's new |
|---|---|---|
| 1 | porch railing | learn it: the switch, blinking bulbs, the box |
| 2 | + porch roof | the ladder, Grandma at the windows, the cat |
| 3 | + the eaves | the squirrel |
| 4 | | the dog |
| 5 | | the neighbour kid's snowballs |
| 6+ | round again | bulbs go faster each night |

Only one troublemaker (Grandma or a pest) is about at a time, with a breather of a few seconds
between them (`TROUBLE_GAP`).

**The pests** (`js/pests.js`). Tap one and Dad goes after it (up the ladder if need be) and swats it
when he gets there (WHAP! SHOO! +30); tap anything else to call off the chase. Each pest knocks
loose **one bulb at most**, then it's off (Dad can't carry enough bulbs for more).
- **the cat** walks along a strand and sits on it, bats one bulb beside her loose, and wanders off;
  while she's sitting there Dad can't get at the bulbs beside her.
- **the squirrel** runs along a wire (stopping now and then to chew) till he knocks a bulb loose,
  then runs off fast.
- **the dog** runs at Dad and grabs his bag of bulbs. Swat him on his way in, or chase him round
  the yard after and swat him to get the bag back (GOT 'IM! +75). Or just refill at the box.
- **the kid next door** stands by the neighbours' house throwing snowballs, up to three, until Dad
  goes over there: at Dad up the ladder (knocked off), or at a bulb (knocked half loose), which
  is always his last.

## Art

The characters are cartoons made with SwarmUI on cerebro (Z-Image Turbo), in `img/`:

```
python3 tools/swarm.py dog "character sheet of the same scruffy mutt dog. Two poses side by side ..." --w 1536 --h 768
python3 tools/cutout.py art/source/gen/dog-1.png dog-run dog-sit
```

`swarm.py` adds the house cartoon style to the prompt and saves the pictures to `art/source/gen/`;
`cutout.py` makes the white background see-through and saves each figure, left to right, under the
names given. Asking for a "character sheet of the same ..." with poses side by side keeps a character
looking the same from pose to pose. Every sprite is shown at a set height, so a new picture of any
size drops straight in; the artist's pictures can replace these the same way. The house, bulbs and
little things are still drawn in code (`js/house.js`, `js/textures.js`). `art/source/` (reference
pictures and the raw generations) stays out of git. The night sky is a painted picture too
(`img/sky.jpg`), and so are the snowman, the pine trees, the bushes and the candy canes.

## Voices

`node tools/make-voices.mjs` records every line in `sayings/sayings.json` with Chatterbox on cerebro
(http://192.168.40.110:8004) into `sayings/voices/`, skipping ones already done: Dad (Leonardo, deeper),
Grandma (Abigail, a touch higher) and the kid (Emily, higher still); the voices are `SPEAKERS` at the
top of the script. `--samples` records a line in four voices for each into `sayings/voice-samples/`
to pick from; then change `SPEAKERS` and run with `--force`. Don't restart cerebro or its other
services without asking Gene.

## Releasing

Open source (MIT, see `LICENSE`): a public GitHub repo, GeneArnold/lights-out, with its own
Amplify app in the Entertainment AWS account at `lights.thefunshed.com`, every push to `main` a release. `amplify.yml`
and the NEW VERSION button are already in place. Scores stay on the phone until the app is added to
the Shed service (`scoresUrl` in `js/config.js`).
