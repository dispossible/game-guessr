import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import z from "zod";

const CACHE_DIR = resolve("server/data/steamGames");

const SteamScreenshotSchema = z.looseObject({
    id: z.number(),
    path_thumbnail: z.string(),
    path_full: z.string(),
});

export const SteamGameDetailsSchema = z.looseObject({
    steam_appid: z.number().int(),
    name: z.string(),
    header_image: z.string().optional(),
    screenshots: z.array(SteamScreenshotSchema).default([]),
});

export type SteamGameDetails = z.infer<typeof SteamGameDetailsSchema>;

const memoryCache = new Map<number, SteamGameDetails>();

async function readFromDisk(appId: number): Promise<SteamGameDetails | null> {
    const filePath = resolve(CACHE_DIR, `${appId}.json`);
    try {
        const raw = await readFile(filePath, "utf-8");
        const parsed = SteamGameDetailsSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

async function writeToDisk(appId: number, details: SteamGameDetails): Promise<void> {
    try {
        await mkdir(CACHE_DIR, { recursive: true });
        const filePath = resolve(CACHE_DIR, `${appId}.json`);
        await writeFile(filePath, JSON.stringify(details, null, 2), "utf-8");
    } catch (err) {
        console.warn(`[steamApi] Failed to write cache for appId ${appId}:`, err);
    }
}

async function fetchFromSteam(appId: number): Promise<SteamGameDetails | null> {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;

        const json = (await res.json()) as Record<string, unknown>;
        const entry = json[String(appId)] as { success?: boolean; data?: unknown } | undefined;

        if (!entry?.success || !entry.data) return null;

        const parsed = SteamGameDetailsSchema.safeParse(entry.data);
        if (!parsed.success) return null;
        if (parsed.data.screenshots.length === 0) return null;

        return parsed.data;
    } catch (err) {
        console.warn(`[steamApi] Fetch failed for appId ${appId}:`, err);
        return null;
    }
}

export async function getSteamGameDetails(appId: number): Promise<SteamGameDetails | null> {
    const cached = memoryCache.get(appId);
    if (cached) return cached;

    const fromDisk = await readFromDisk(appId);
    if (fromDisk) {
        memoryCache.set(appId, fromDisk);
        return fromDisk;
    }

    const fromSteam = await fetchFromSteam(appId);
    if (!fromSteam) return null;

    memoryCache.set(appId, fromSteam);
    void writeToDisk(appId, fromSteam);

    return fromSteam;
}

export function getScreenshots(details: SteamGameDetails): string[] {
    return details.screenshots.map((s) => s.path_full);
}
