import type { Game } from "#shared/types/Game";

let games: Game[] = [];
let normalizedNames: string[] = [];

function normalize(s: string): string {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function loadGames(g: Game[]) {
    games = g.sort((a, b) => (b.peakCcu ?? 0) - (a.peakCcu ?? 0));
    normalizedNames = games.map((x) => normalize(x.name));
}

export function getGameCount(): number {
    return games.length;
}

export function pickRandomGame(excludeAppIds?: Set<number>): Game | undefined {
    const pool = excludeAppIds ? games.filter((g) => !excludeAppIds.has(g.appId)) : games;
    if (pool.length === 0) return undefined;
    return pool[Math.floor(Math.random() * pool.length)];
}

export function searchGames(q: string, limit = 10): Game[] {
    const needle = normalize(q);
    if (!needle) return [];

    const hits: { game: Game; score: number }[] = [];
    for (let i = 0; i < games.length; i++) {
        const game = games[i]!;
        const n = normalizedNames[i];
        const idx = n?.indexOf(needle) ?? -1;
        if (idx === -1) continue;
        // prefix matches rank above mid-string matches; ties broken by popularity
        hits.push({ game, score: idx === 0 ? 0 : 1 });
        if (hits.length > limit * 4) break;
    }

    return hits
        .sort((a, b) => a.score - b.score || (b.game.followers ?? 0) - (a.game.followers ?? 0))
        .slice(0, limit)
        .map((h) => h.game);
}
