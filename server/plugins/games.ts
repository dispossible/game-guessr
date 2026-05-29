import { GameSchema } from "#shared/types/Game";
import z from "zod";
import { loadGames, getGameCount } from "../utils/gameStore";
import games from "../data/games.json";

export default defineNitroPlugin(async () => {
    const result = z.array(GameSchema).safeParse(games);
    if (!result.success) {
        console.error("[games] games.json failed schema validation:", result.error.issues.slice(0, 5));
        return;
    }

    loadGames(result.data);
    console.log(`[games] Loaded ${getGameCount().toLocaleString()} games into memory.`);
});
