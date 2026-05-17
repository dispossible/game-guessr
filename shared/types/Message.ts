import z from "zod";
import { DifficultySchema, GameStateSchema, PlayerSchema } from "./GameState";

export const MessageTypeSchema = z.enum([
    "joinRoom",
    "joinedRoom",
    "leaveRoom",
    "leftRoom",
    "createRoom",
    "failedToJoinRoom",
    "startRound",
    "makeGuess",
    "gameState",
]);
export const MessageType = MessageTypeSchema.enum;
export type MessageType = z.infer<typeof MessageTypeSchema>;

// Request to join a room from the client
export const JoinRoomMessageSchema = z.object({
    type: z.literal(MessageType.joinRoom),
    roomId: z.string(),
    playerName: z.string(),
    clientId: z.string(),
});
export type JoinRoomMessage = z.infer<typeof JoinRoomMessageSchema>;

// Response from the server that a player has joined the room
export const JoinedRoomMessageSchema = z.object({
    type: z.literal(MessageType.joinedRoom),
    roomId: z.string(),
    player: PlayerSchema,
});
export type JoinedRoomMessage = z.infer<typeof JoinedRoomMessageSchema>;

// Request to leave from the client
export const LeaveRoomMessageSchema = z.object({
    type: z.literal(MessageType.leaveRoom),
});
export type LeaveRoomMessage = z.infer<typeof LeaveRoomMessageSchema>;

// Response from the server that a player has left the room
export const LeftRoomMessageSchema = z.object({
    type: z.literal(MessageType.leftRoom),
    userId: z.string(),
    roomId: z.string(),
    // The current host's id, which may have just changed if the leaving player
    // was the host.
    hostId: z.string(),
});
export type LeftRoomMessage = z.infer<typeof LeftRoomMessageSchema>;

export const CreateRoomMessageSchema = z.object({
    type: z.literal(MessageType.createRoom),
    playerName: z.string(),
    clientId: z.string(),
});
export type CreateRoomMessage = z.infer<typeof CreateRoomMessageSchema>;

export const FailedToJoinRoomMessageSchema = z.object({
    type: z.literal(MessageType.failedToJoinRoom),
    roomId: z.string(),
});
export type FailedToJoinRoomMessage = z.infer<typeof FailedToJoinRoomMessageSchema>;

export const StartRoundMessageSchema = z.object({
    type: z.literal(MessageType.startRound),
    roomId: z.string(),
    // Optional settings only applied when starting the very first round (lobby -> playing)
    roundCount: z.number().int().min(1).max(30).optional(),
    roundDuration: z.number().int().min(1000).max(600000).optional(),
    difficulty: DifficultySchema.optional(),
});
export type StartRoundMessage = z.infer<typeof StartRoundMessageSchema>;

export const GameStateMessageSchema = z.object({
    type: z.literal(MessageType.gameState),
    gameState: GameStateSchema,
});
export type GameStateMessage = z.infer<typeof GameStateMessageSchema>;

export const MessageSchema = z.discriminatedUnion("type", [
    JoinRoomMessageSchema,
    JoinedRoomMessageSchema,
    LeaveRoomMessageSchema,
    LeftRoomMessageSchema,
    FailedToJoinRoomMessageSchema,
    CreateRoomMessageSchema,

    StartRoundMessageSchema,
    GameStateMessageSchema,
]);
export type Message = z.infer<typeof MessageSchema>;
