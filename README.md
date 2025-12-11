LearnedLeague Results Schedule Fill (Chrome Extension)

What it does
- On LearnedLeague player profile pages, the extension fetches the player’s current rundle standings.
- It fills any blank cells in the “LL* Results” table for Match Days after MD1 (i.e., MD2–MD25) with:
  - Result: opponent’s TCA
  - Record: opponent’s W-L-T
  - Rank: opponent’s current rank in the rundle

Scope and behavior
- Only operates after Match Day 1: rows with MD number 2 through 25 are considered.
- Only fills blank cells: if a Result/Record/Rank cell already has content, the extension leaves it unchanged.
- Works with learnedleague.com and www.learnedleague.com domains.
- Uses your logged-in session (fetch with credentials) and does not send data elsewhere.

Install
1) Open Chrome → Extensions → enable Developer Mode
2) Click “Load Unpacked” and select the folder with manifest.json

Notes
- Name normalization handles non-breaking spaces and minor spacing differences; if a name can’t be matched, the row remains unchanged.
- If LL changes table layouts, adjust column indexes in content.js (rank: td[0], player: td[2], W/L/T: td[3..5], TCA: td[9]).
- To expand scope (e.g., include MD1 or add more fields like DE/MPD), update isAfterMD1 logic and parsing accordingly.

