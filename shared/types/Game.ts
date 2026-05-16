import z from "zod";

export const GameSchema = z.object({
    appId: z.number().int(),
    name: z.string(),
    rating: z.number(),
    releaseDate: z.string(),
    followers: z.number().int(),
    peakCcu: z.number().int(),
    tagIds: z.array(z.number().int()),
});
export type Game = z.infer<typeof GameSchema>;
