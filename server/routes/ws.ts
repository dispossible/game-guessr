import z from "zod";
import { MessageSchema, MessageType } from "#shared/types/Message";
import { initNewRoom, joinRoom, leaveRoom } from "../utils/roomStore";

export default defineWebSocketHandler({
    open(peer) {
        console.log(`[ws] New connection: ${peer.id}`);
    },

    close(peer) {
        console.log(`[ws] Connection closed: ${peer.id}`);
        leaveRoom(peer);
    },

    message(peer, message) {
        const rawData = message.json();
        const result = MessageSchema.safeParse(rawData);

        if (!result.success) {
            console.log(`[ws] Invalid message recieved: ${z.treeifyError(result.error)}`);
            return;
        }

        const data = result.data;

        switch (data.type) {
            case MessageType.createRoom:
                initNewRoom(peer, data.playerName);
                break;

            case MessageType.joinRoom:
                joinRoom(peer, data.roomId, data.playerName);
                break;

            case MessageType.leaveRoom:
                leaveRoom(peer);
                break;
        }
    },
});
