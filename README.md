# LearnedLeague Results Schedule Fill (Chrome Extension)

## What it does

- On LearnedLeague player profile pages, this extension fetches the player’s current rundle standings to project outcomes for future matches.
- It fills any blank cells in the “LL* Results” table for Match Days 2 through 25 with the following projected stats:
  - **Result**: A projection based on a detailed statistical comparison. The cell displays `OEPAA⋅PEPAA`, representing the **Opponent's Expected Points Against, Adjusted** and **Player's Expected Points Against, Adjusted**. The cell is shaded red on the left if the opponent is favored and green on the right if the player is favored.
  - A tooltip on this cell provides a full breakdown of the calculation:
      - `PEPA`/`OEPA`: Player/Opponent Expected Points Against.
      - `PEPAA`/`OEPAA`: The values above, adjusted for the number of games the opponent has played.
      - The raw TCA and PCAA values for both the player and the opponent.
  - **Record**: The opponent’s current `W-L-T` record.
  - **Rank**: The opponent’s current rank in the rundle.

## Scope and behavior

- **Only operates after Match Day 1:** Rows with MD number 2 through 25 are considered.
- **Only fills blank cells:** If a Result/Record/Rank cell already has content, the extension leaves it unchanged.
- **Works with `learnedleague.com` and `www.learnedleague.com` domains.**
- **Uses your logged-in session** (fetch with credentials) and does not send data elsewhere.

## Install

1. Open Chrome → Extensions → enable Developer Mode
2. Click “Load Unpacked” and select the folder with `manifest.json`.

## Notes

- Name normalization handles non-breaking spaces and minor spacing differences; if an opponent's name can’t be matched in the standings, the row remains unchanged.
- If LearnedLeague changes its site layout, the extension may need to be updated.

