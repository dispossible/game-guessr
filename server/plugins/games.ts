import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GameSchema } from "#shared/types/Game";
import z from "zod";
import { loadGames, getGameCount } from "../utils/gameStore";

export default defineNitroPlugin(async () => {
    const dataPath = resolve("server/data/games.json");

    let raw: string;
    try {
        raw = await readFile(dataPath, "utf-8");
    } catch {
        console.warn("[games] server/data/games.json not found — game search will return empty results. Run the browser scraper and commit the file.");
        return;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        console.error("[games] server/data/games.json is not valid JSON — skipping load.");
        return;
    }

    const result = z.array(GameSchema).safeParse(parsed);
    if (!result.success) {
        console.error("[games] games.json failed schema validation:", result.error.issues.slice(0, 5));
        return;
    }

    loadGames(result.data);
    console.log(`[games] Loaded ${getGameCount().toLocaleString()} games into memory.`);
});
