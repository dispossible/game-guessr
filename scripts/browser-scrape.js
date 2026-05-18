/**
 * GAME GUESSR — SteamDB browser-console scraper
 *
 * HOW TO USE
 * ----------
 * 1. Open a SteamDB tag page in your real browser (already past Cloudflare):
 *    https://steamdb.info/tag/{id}/?category=-888&displayOnly=Game&min_followers=10000&min_rating=90&min_reviews=500&sort=peak_desc
 *
 * 2. Open DevTools → Console, paste this entire script and press Enter.
 *    It extracts all rows for the current tag and merges them into localStorage.
 *    Repeat for every tag page you want to cover.
 *
 * 3. After all pages, call:
 *      gameGuessrDownload()   → triggers a download of games.json
 *      gameGuessrReset()      → clears the accumulator (start fresh)
 *
 * 4. Move the downloaded file to server/data/games.json and commit it.
 *
 * TIPS
 * ----
 * - You can save this as a DevTools snippet so you don't need to re-paste.
 * - The script logs which tags you've done and which remain after every run.
 * - It uses the DataTables JS API to pull ALL filtered rows at once (no pagination).
 *   If that API isn't available it falls back to visible DOM rows.
 */

(async () => {
    // ── All tag/genre IDs from server/utils/steamTags.ts + steamGenres.ts ──────
    const ALL_TAG_IDS = new Set([
        // steamGenres.ts  (IDs parsed from hrefs: /tag/{id}/)
        492, 19, 597, 21, 599, 9, 122, 4106, 701, 699, 8013, 1743,
    ]);

    const LS_KEY = "gameGuessrScrape";

    // ── Helpers exposed on window ─────────────────────────────────────────────
    window.gameGuessrDownload = () => {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) {
            console.warn("[gameGuessr] Nothing in accumulator — run the scraper on some tag pages first.");
            return;
        }
        const map = JSON.parse(raw);
        const games = Object.values(map);
        const blob = new Blob([JSON.stringify(games, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "games.json";
        a.click();
        URL.revokeObjectURL(url);
        console.log(`[gameGuessr] Downloaded games.json with ${games.length} games.`);
    };

    window.gameGuessrReset = () => {
        localStorage.removeItem(LS_KEY);
        console.log("[gameGuessr] Accumulator cleared.");
    };

    // ── Detect current tag id from URL ────────────────────────────────────────
    const match = location.pathname.match(/\/tag\/(\d+)\//);
    if (!match) {
        console.error(
            "[gameGuessr] Not on a SteamDB tag page (/tag/{id}/). Navigate to the correct URL and try again.",
        );
        return;
    }
    const tagId = parseInt(match[1], 10);

    // ── Extract rows ──────────────────────────────────────────────────────────
    const rows = [];

    // Primary path: DataTables API gives us every filtered row, not just the visible page.
    try {
        const dtRows = $("table.datatable, table.dataTable").first().DataTable().rows({ search: "applied" }).data();
        if (dtRows && dtRows.length > 0) {
            for (let i = 0; i < dtRows.length; i++) {
                const row = dtRows[i];
                // Column order on SteamDB tag pages (filtered/sorted view):
                //   0: id  1: image  2: name  3: discount  4: price  5: rating  6: release  7: followers  8: ccu  9: peak ccu
                //
                // Each cell is either a plain string or an object: { display: "<html>", "@data-sort": "rawValue" }
                // "@data-sort" is a clean scalar (no commas, no HTML) — ideal for numeric fields.
                // "display" is a human-readable string — used for releaseDate.
                const sortVal = (idx) => {
                    const cell = row[idx];
                    return cell != null && typeof cell === "object" ? cell["@data-sort"] : cell;
                };
                const displayVal = (idx) => {
                    const cell = row[idx];
                    return cell != null && typeof cell === "object" ? cell["display"] : cell;
                };
                const parseSort = (idx) => {
                    const n = parseFloat(String(sortVal(idx) ?? ""));
                    return isNaN(n) ? undefined : n;
                };

                // col 0: id — @data-sort holds the raw appId number
                const appId = parseInt(String(sortVal(0) ?? ""), 10) || null;
                if (!appId) continue;

                // col 2: name — plain HTML string, grab the inner text of the <a class="b"> link
                const nameHtml = String(row[2] ?? "");
                const nameMatch = nameHtml.match(/class="b"[^>]*>([^<]+)<\/a>/);
                const rawName = nameMatch ? nameMatch[1].trim() : nameHtml.replace(/<[^>]+>/g, "").trim();
                // Decode HTML entities (e.g. &amp; → &) that SteamDB includes in the HTML
                const txt = document.createElement("textarea");
                txt.innerHTML = rawName;
                const name = txt.value;
                if (!name) continue;

                // col 5: rating — @data-sort is "93.54" (percentage without % symbol)
                // col 6: release — display is "May 2019", @data-sort is a unix timestamp
                // col 7: followers — @data-sort is a clean integer string
                // col 9: peak ccu — @data-sort is a clean integer string
                rows.push({
                    appId,
                    name,
                    rating: parseSort(5),
                    releaseDate: String(displayVal(6) ?? "").trim() || undefined,
                    followers: parseSort(7) !== undefined ? Math.round(parseSort(7)) : undefined,
                    peakCcu: parseSort(9) !== undefined ? Math.round(parseSort(9)) : undefined,
                });
            }
        }
    } catch (_) {
        // DataTables API not available
    }

    if (rows.length === 0) {
        console.warn("[gameGuessr] No rows found. Make sure you're on a SteamDB tag page with the table loaded.");
        return;
    }

    // ── Merge into localStorage accumulator ───────────────────────────────────
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    let newCount = 0;
    let seenCount = 0;

    for (const game of rows) {
        if (existing[game.appId]) {
            // Merge: keep best-populated fields, union tagIds
            const prev = existing[game.appId];
            prev.tagIds = [...new Set([...(prev.tagIds ?? []), tagId])];
            prev.rating = prev.rating ?? game.rating;
            prev.releaseDate = prev.releaseDate ?? game.releaseDate;
            prev.followers = Math.max(prev.followers ?? 0, game.followers ?? 0) || undefined;
            prev.peakCcu = Math.max(prev.peakCcu ?? 0, game.peakCcu ?? 0) || undefined;
            seenCount++;
        } else {
            existing[game.appId] = { ...game, tagIds: [tagId] };
            newCount++;
        }
    }

    localStorage.setItem(LS_KEY, JSON.stringify(existing));
    const total = Object.keys(existing).length;

    // ── Progress report ───────────────────────────────────────────────────────
    const doneTags = new Set(Object.values(existing).flatMap((g) => g.tagIds ?? []));
    const remaining = [...ALL_TAG_IDS].filter((id) => !doneTags.has(id));

    console.log(
        `%c[gameGuessr] tag ${tagId}: +${newCount} new, ${seenCount} already-seen, total ${total.toLocaleString()} games`,
        "color: #6dd58c; font-weight: bold",
    );

    if (remaining.length === 0) {
        console.log(
            "%c[gameGuessr] All tags covered! Call gameGuessrDownload() to save games.json",
            "color: #7c9cff; font-weight: bold",
        );
    } else {
        console.log(`[gameGuessr] Tags remaining (${remaining.length}): ${remaining.join(", ")}`);
        const nextId = remaining[0];
        console.log(
            `[gameGuessr] Next → https://steamdb.info/tag/${nextId}/?category=-888&displayOnly=Game&min_followers=10000&min_rating=90&min_reviews=500&sort=peak_desc`,
        );
    }
})();
