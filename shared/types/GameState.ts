import z from "zod";

export const PlayerSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    score: z.number().default(0),
});
export type Player = z.infer<typeof PlayerSchema>;

export const GameStateSchema = z.object({
    id: z.string(),
    players: z.array(PlayerSchema),
});
export type GameState = z.infer<typeof GameStateSchema>;
