import z from "zod";

export const PlayerSchema = z.object({
    id: z.string(),
    name: z.string(),
    score: z.number().default(0),
});

export const GameStatusSchema = z.enum(["lobby", "playing", "finished"]);
export const GameStatus = GameStatusSchema.enum;
export type GameStatus = z.infer<typeof GameStatusSchema>;
export type Player = z.infer<typeof PlayerSchema>;

export const RoundStatusSchema = z.enum(["pending", "inProgress", "completed"]);
export const RoundStatus = RoundStatusSchema.enum;
export type RoundStatus = z.infer<typeof RoundStatusSchema>;

export const RoundSchema = z.object({
    number: z.number(),
    status: RoundStatusSchema,
    startTime: z.number(),
    endTime: z.number(),
    guesses: z.array(
        z.object({
            playerId: z.string(),
            guess: z.number(),
            score: z.number(),
            correct: z.boolean(),
        }),
    ),
});
export type Round = z.infer<typeof RoundSchema>;

export const GameStateSchema = z.object({
    id: z.string(),
    hostId: z.string(),
    players: z.array(PlayerSchema),
    status: GameStatusSchema.default(GameStatus.lobby),
    roundCount: z.number().default(5),
    roundDuration: z.number().default(60000),
    rounds: z.array(RoundSchema),
});
export type GameState = z.infer<typeof GameStateSchema>;
