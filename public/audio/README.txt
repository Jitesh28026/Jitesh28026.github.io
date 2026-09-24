Soundtrack for /flat
====================

Drop a single file here named:

    soundtrack.mp3

That is the only name the page looks for. Nothing else needs changing; the
path lives in src/scripts/film/audio.ts as TRACK_SRC.

If the file is absent the film simply runs silent: the controller no-ops and
the corner sound toggle stays hidden. Nothing breaks.

Notes
-----
- mp3 is the safe universal choice. The browser has to decode it.
- The track loops, so prefer something that comes back around cleanly.
- It plays at 0.45 volume and fades in over 2.2s, so a busy master will still
  sit further forward than you expect. Quiet, warm and slow suits the flat.
- Playback can only begin from a user gesture, which is what the "Come in"
  button on the preloader is for.
