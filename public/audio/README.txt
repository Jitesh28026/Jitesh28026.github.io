Soundtrack for /flat
====================

Drop a single file here named:

    soundtrack.mp3

That is the only name the page looks for. Nothing else needs changing; the
path lives in src/scripts/film/audio.ts as TRACK_SRC.

If the file is absent the film simply runs silent: the controller no-ops and
the corner sound toggle stays hidden. Nothing breaks.

Currently playing
-----------------
"Dreamshifter" by HoliznaCC0, licensed CC0 1.0 Universal (public domain), so
no attribution is required and commercial use is fine.

Source file lives in "video website/" and is NOT what ships. It was 320kbps
with 8.6s of digital silence on the end, which would have left a long dead gap
on every loop. The shipped file is trimmed to 149s and re-encoded at 128kbps,
6.3MB down to 2.4MB. Regenerate with:

  ffmpeg -i "<source>.mp3" -t 149.0 -af "afade=t=out:st=148.5:d=0.5"     -c:a libmp3lame -b:a 128k -ar 44100 public/audio/soundtrack.mp3

Notes
-----
- mp3 is the safe universal choice. The browser has to decode it.
- The track loops, so prefer something that comes back around cleanly.
- It plays at 0.45 volume and fades in over 2.2s, so a busy master will still
  sit further forward than you expect. Quiet, warm and slow suits the flat.
- Playback can only begin from a user gesture, which is what the "Come in"
  button on the preloader is for.
