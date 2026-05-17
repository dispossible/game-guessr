import z from "zod";
import { MessageSchema, MessageType } from "#shared/types/Message";
import { handlePeerClose, initNewRoom, joinRoom, leaveRoom } from "../utils/roomStore";
import { startRound } from "../utils/roundStore";

export default defineWebSocketHandler({
    open(peer) {
        console.log(`[ws] New connection: ${peer.id}`);
    },

    close(peer) {
        console.log(`[ws] Connection closed: ${peer.id}`);
        // Keep the player in their room so a refresh can reattach to the same
        // clientId and keep their score. Explicit leaves go through leaveRoom.
        handlePeerClose(peer);
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
                initNewRoom(peer, data.playerName, data.clientId);
                break;

            case MessageType.joinRoom:
                joinRoom(peer, data.roomId, data.playerName, data.clientId);
                break;

            case MessageType.leaveRoom:
                leaveRoom(peer);
                break;

            case MessageType.startRound:
                startRound(peer, data.roomId, { roundCount: data.roundCount, roundDuration: data.roundDuration }).catch(
                    (err) => console.error("[ws] startRound failed:", err),
                );
                break;
        }
    },
});
