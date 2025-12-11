// filename: content.js
(function() {
  "use strict";

  // Gate: only run on profiles.php?<id> or profiles.php?<id>&1 where <id> is a non-zero integer
  const url = new URL(window.location.href);
  const pathname = url.pathname.toLowerCase();
  const isProfiles = pathname.endsWith("/profiles.php") || pathname === "/profiles.php";
  const q = url.search.startsWith("?") ? url.search.slice(1) : url.search;
  const idOnlyMatch = q.match(/^([1-9]\d*)$/);
  const idAndOneMatch = q.match(/^([1-9]\d*)&1$/);
  const allowed = isProfiles && (!!idOnlyMatch || !!idAndOneMatch);
  if (!allowed) return;

  function normalize(text) {
    if (!text) return "";
    return text.replace(/\u00A0/g, " ").trim().replace(/\s+/g, " ");
  }
  function toUpper(text) { return normalize(text).toUpperCase(); }
  function log(...args) { console.log("[LL Autofill]", ...args); }
  function warn(...args) { console.warn("[LL Autofill]", ...args); }
  function error(...args) { console.error("[LL Autofill]", ...args); }

  function findCurrentSeasonTable(doc) {
    const tables = [...doc.querySelectorAll("table.std, table.std.std_bord")];
    for (const tbl of tables) {
      const headerRow = tbl.querySelector("thead tr");
      if (!headerRow) continue;
      const headers = [...headerRow.querySelectorAll("td, th")].map(c => toUpper(c.textContent));
      const hasWLT = headers.includes("W") && headers.includes("L") && headers.includes("T");
      const hasPTS = headers.includes("PTS");
      const hasTMP = headers.includes("TMP");
      const hasTCA = headers.includes("TCA");
      const hasPCAA = headers.includes("PCAA");
      const hasRank = headers.includes("RANK");
      if (hasWLT && hasPTS && hasTMP && hasTCA && hasPCAA && hasRank) return tbl;
    }
    return null;
  }

  // Extract rundle link + player TCA/PCAA from the same row
  function getCurrentSeasonData(doc) {
    const seasonTable = findCurrentSeasonTable(doc);
    if (!seasonTable) return null;
    const headerCells = [...seasonTable.querySelectorAll("thead tr td, thead tr th")].map(c => normalize(c.textContent).toUpperCase());
    const bodyRow = seasonTable.querySelector("tbody tr");
    if (!bodyRow) return null;
    const cells = [...bodyRow.querySelectorAll("td")];
    const idx = {
      rundle: 0,
      tca: headerCells.indexOf("TCA"),
      pcaa: headerCells.indexOf("PCAA")
    };
    if (idx.tca < 0 || idx.pcaa < 0) return null;

    const rundleAnchor = cells[idx.rundle]?.querySelector("a[href*='standings.php']");
    const playerTCA = parseFloat(normalize(cells[idx.tca]?.textContent || ""));
    const playerPCAA = parseFloat(normalize(cells[idx.pcaa]?.textContent || ""));
    if (!rundleAnchor || Number.isNaN(playerTCA) || Number.isNaN(playerPCAA)) return null;

    return {
      rundleHref: rundleAnchor.href,
      playerTCA,
      playerPCAA
    };
  }

  function findResultsTable(doc) {
    const tables = [...doc.querySelectorAll("table.std, table")];
    for (const tbl of tables) {
      const headerRow = tbl.querySelector("thead tr");
      if (!headerRow) continue;
      const headers = [...headerRow.querySelectorAll("td, th")].map(c => toUpper(c.textContent));
      const ok = ["MATCH DAY", "OPPONENT", "RESULT", "RECORD", "RANK"]
        .every(h => headers.some(x => x.includes(h)));
      if (ok) {
        log("Results table found");
        return tbl;
      }
    }
    warn("Results table not found");
    return null;
  }

  // Helper: slice before first dot for truncation-aware comparison
  function sliceBeforeDot(s) {
    const idx = s.indexOf(".");
    return idx > -1 ? s.slice(0, idx) : s;
  }

  // Parse standings and return a map: displayName -> { tca, pcaa, w, l, t, record, rank }
  function parseStandings(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const upper = (s) => (s || "").replace(/\u00A0/g, " ").trim().replace(/\s+/g, " ").toUpperCase();
    const clean = (s) => (s || "").replace(/\u00A0/g, " ").trim().replace(/\s+/g, " ");

    const tables = [...doc.querySelectorAll("table")];
    let table = null;
    let col = null;

    for (const tbl of tables) {
      const headRow = tbl.querySelector("thead tr");
      if (!headRow) continue;
      const headerCells = [...headRow.querySelectorAll("td, th")];
      if (!headerCells.length) continue;

      const headers = headerCells.map(c => upper(c.textContent));
      const idx = {
        rank: headers.indexOf("RANK"),
        player: headers.indexOf("PLAYER"),
        w: headers.indexOf("W"),
        l: headers.indexOf("L"),
        t: headers.indexOf("T"),
        tca: headers.indexOf("TCA"),
        pcaa: headers.indexOf("PCAA")
      };
      const hasEssentials = idx.player >= 0 && idx.w >= 0 && idx.l >= 0 && idx.t >= 0 && idx.tca >= 0 && idx.pcaa >= 0;
      if (!hasEssentials) continue;

      table = tbl;
      col = {
        rank: idx.rank >= 0 ? idx.rank : 0,
        player: idx.player,
        w: idx.w,
        l: idx.l,
        t: idx.t,
        tca: idx.tca,
        pcaa: idx.pcaa
      };
      break;
    }

    if (!table || !col) {
      warn("Standings table not found: header scan failed");
      return null;
    }

    const map = new Map();
    const rows = [...table.querySelectorAll("tbody tr")];
    rows.forEach((tr, idx) => {
      const cells = [...tr.querySelectorAll("td")];
      if (!cells.length) return;
      const textAny = cells.some(c => clean(c.textContent).length > 0);
      if (!textAny) return;

      const rankText = clean(cells[col.rank]?.textContent ?? String(idx + 1));
      const playerCell = cells[col.player];
      const playerName = clean(playerCell?.textContent || "");
      if (!playerName) return;

      const wStr = clean(cells[col.w]?.textContent || "");
      const lStr = clean(cells[col.l]?.textContent || "");
      const tStr = clean(cells[col.t]?.textContent || "");
      const tcaStr = clean(cells[col.tca]?.textContent || "");
      const pcaaStr = clean(cells[col.pcaa]?.textContent || "");

      const w = parseInt(wStr, 10);
      const l = parseInt(lStr, 10);
      const t = parseInt(tStr, 10);
      const tca = parseFloat(tcaStr);
      const pcaa = parseFloat(pcaaStr);

      if ([w, l, t].some(n => Number.isNaN(n)) || Number.isNaN(tca) || Number.isNaN(pcaa)) return;

      const record = `${w}-${l}-${t}`;
      const payload = { tca, pcaa, w, l, t, record, rank: rankText || String(idx + 1) };

      // Store canonical standings display name exactly (case/punctuation preserved)
      map.set(playerName, payload);
    });

    log("Parsed standings entries:", map.size);
    return map.size ? map : null;
  }

  function parseMatchDayNumber(mdText) {
    const m = toUpper(mdText).match(/(?:MATCH\s*DAY|MD)\s*(\d{1,2})/);
    if (!m) return null;
    const num = parseInt(m[1], 10);
    return Number.isFinite(num) ? num : null;
  }

  // Shade halves using a gradient: left red, right green
  function applyHalfShade(cell, leftRed, rightGreen) {
    if (!leftRed && !rightGreen) {
      cell.style.background = "";
      return;
    }
    const leftColor = leftRed ? "rgba(255, 0, 0, 0.15)" : "transparent";
    const rightColor = rightGreen ? "rgba(0, 128, 0, 0.15)" : "transparent";
    cell.style.backgroundImage = `linear-gradient(to right, ${leftColor} 50%, ${rightColor} 50%)`;
    cell.style.backgroundSize = "100% 100%";
    cell.style.backgroundRepeat = "no-repeat";
    cell.style.textAlign = "center";
  }

  function fillResults(resultsTable, standingsMap, playerTCA, playerPCAA) {
    const dataRows = [...resultsTable.querySelectorAll("tbody tr")];
    let filled = 0;

    for (const tr of dataRows) {
      const cells = [...tr.querySelectorAll("td")];
      if (cells.length < 6) continue;

      const mdNum = parseMatchDayNumber(cells[0]?.textContent || "");
      if (mdNum === null || mdNum < 2 || mdNum > 25) continue;

      const resultBlank = !normalize(cells[3]?.textContent || "");
      const recordBlank = !normalize(cells[4]?.textContent || "");
      const rankBlank = !normalize(cells[5]?.textContent || "");
      if (!(resultBlank || recordBlank || rankBlank)) continue;

      const opponentDisplay = normalize(cells[1]?.textContent || "");
      if (!opponentDisplay) continue;

      // Strict matching: exact, then truncation-aware prefix equality
      let data = standingsMap.get(opponentDisplay);
      if (!data) {
        const oppPrefix = sliceBeforeDot(opponentDisplay);
        for (const [key, val] of standingsMap.entries()) {
          const keyPrefix = sliceBeforeDot(key);
          if (keyPrefix.length > 0) {
            const oppHead = opponentDisplay.slice(0, keyPrefix.length);
            if (keyPrefix === oppHead) { data = val; break; }
            const keyHead = key.slice(0, oppPrefix.length);
            if (oppPrefix === keyHead) { data = val; break; }
          }
        }
      }

      if (!data) {
        warn("Opponent not found in standings:", opponentDisplay);
        continue;
      }

      // Games played from opponent record
      const gamesPlayed = data.w + data.l + data.t;

      // Renamed variables and calculations
      const PEPA = playerTCA * data.pcaa;
      const OEPA = data.tca * playerPCAA;

      const PEPAA = gamesPlayed > 0 ? PEPA / gamesPlayed : 0;
      const OEPAA = gamesPlayed > 0 ? OEPA / gamesPlayed : 0;

      // Tooltip on Result cell
      const tooltip = [
        `Opponent: TCA=${data.tca}, PCAA=${data.pcaa}`,
        `Player: TCA=${playerTCA}, PCAA=${playerPCAA}`,
        `PEPA=${PEPA.toFixed(3)}, OEPA=${OEPA.toFixed(3)}`,
        `PEPAA=${PEPAA.toFixed(3)}, OEPAA=${OEPAA.toFixed(3)} (games=${gamesPlayed})`
      ].join("\n");

      // Fill cells
      if (resultBlank) {
        // Show "OEPAA / PEPAA" with three decimal places
        cells[3].textContent = `${OEPAA.toFixed(3)}⋅${PEPAA.toFixed(3)}`;
        cells[3].setAttribute("title", tooltip);

        // Shade halves
        const rightGreen = PEPAA > OEPAA;
        const leftRed = OEPAA > PEPAA;
        applyHalfShade(cells[3], leftRed, rightGreen);
      }

      if (recordBlank) cells[4].textContent = data.record;
      if (rankBlank) cells[5].textContent = data.rank;

      filled++;
    }

    log("Rows filled:", filled);
  }

  async function run() {
    try {
      const doc = document;
      const resultsTable = findResultsTable(doc);
      const seasonData = getCurrentSeasonData(doc);

      if (!resultsTable) { warn("Results table not found"); return; }
      if (!seasonData?.rundleHref) { warn("Rundle link not found"); return; }

      const { rundleHref, playerTCA, playerPCAA } = seasonData;

      const res = await fetch(rundleHref, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const htmlText = await res.text();
      console.log("[LL Autofill] Standings HTML size:", htmlText.length);

      const standingsMap = parseStandings(htmlText);
      if (!standingsMap) return;

      fillResults(resultsTable, standingsMap, playerTCA, playerPCAA);
    } catch (e) {
      error("Failed:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
