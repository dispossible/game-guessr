import { searchGames } from "../../utils/gameStore";

export default defineEventHandler((event) => {
    const query = getQuery(event);
    const q = String(query.q ?? "").trim();
    const limit = Math.min(20, Math.max(1, Number(query.limit ?? 10)));
    return { results: searchGames(q, limit) };
});
