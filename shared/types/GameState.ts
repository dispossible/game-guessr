import z from "zod";

export const DifficultySchema = z.enum(["everyEasy", "easy", "medium", "hard", "difficult", "brutal"]);
export const Difficulty = DifficultySchema.enum;
export type Difficulty = z.infer<typeof DifficultySchema>;

export interface DifficultyConfig {
    label: string;
    /** Which segment (0-indexed) of the sorted game list to draw from. */
    tier: number;
    /** Total number of equal segments the list is divided into. */
    totalTiers: number;
}

export const DIFFICULTY_OPTIONS: Record<Difficulty, DifficultyConfig> = {
    everyEasy: { label: "Very easy", tier: 0, totalTiers: 4 },
    easy: { label: "Easy", tier: 0, totalTiers: 3 },
    medium: { label: "Medium", tier: 1, totalTiers: 3 },
    hard: { label: "Hard", tier: 2, totalTiers: 3 },
    difficult: { label: "Difficult", tier: 3, totalTiers: 4 },
    brutal: { label: "Brutal", tier: 5, totalTiers: 6 },
};

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
    screenshots: z.array(z.url()),
    guesses: z.array(
        z.object({
            playerId: z.string(),
            guess: z.number(),
            score: z.number(),
            correct: z.boolean(),
        }),
    ),
    // Populated by the server only once the round is completed, so the answer
    // isn't exposed to clients while the round is still in progress.
    gameName: z.string().optional(),
    headerImage: z.string().optional(),
});
export type Round = z.infer<typeof RoundSchema>;

export const GameStateSchema = z.object({
    id: z.string(),
    hostId: z.string(),
    players: z.array(PlayerSchema),
    status: GameStatusSchema.default(GameStatus.lobby),
    roundCount: z.number().default(5),
    roundDuration: z.number().default(60000),
    difficulty: DifficultySchema.default(Difficulty.easy),
    rounds: z.array(RoundSchema),
});
export type GameState = z.infer<typeof GameStateSchema>;
