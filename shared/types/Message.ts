import z from "zod";

export const MessageTypeSchema = z.enum(["joinRoom", "leaveRoom", "createRoom", "startRound", "makeGuess"]);
export const MessageType = MessageTypeSchema.enum;
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const JoinRoomMessageSchema = z.object({
    type: z.literal(MessageType.joinRoom),
    userId: z.uuid(),
    roomId: z.string(),
});
export type JoinRoomMessage = z.infer<typeof JoinRoomMessageSchema>;

export const LeaveRoomMessageSchema = z.object({
    type: z.literal(MessageType.leaveRoom),
    userId: z.uuid(),
    roomId: z.string(),
});
export type LeaveRoomMessage = z.infer<typeof LeaveRoomMessageSchema>;

export const CreateRoomMessageSchema = z.object({
    type: z.literal(MessageType.createRoom),
});
export type CreateRoomMessage = z.infer<typeof CreateRoomMessageSchema>;

export const StartRoundMessageSchema = z.object({
    type: MessageType,
    roomId: z.string(),
});
export type StartRoundMessage = z.infer<typeof StartRoundMessageSchema>;

export const MessageSchema = z.discriminatedUnion("type", [
    JoinRoomMessageSchema,
    LeaveRoomMessageSchema,
    CreateRoomMessageSchema,
    StartRoundMessageSchema,
]);
export type Message = z.infer<typeof MessageSchema>;
