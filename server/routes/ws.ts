import z from "zod";
import { Message, MessageSchema, MessageType } from "~~/shared/types/Message";
import { addUserToRoom, getUserRoomId, removeUserFromRoom } from "../utils/userStore";
import { closeRoom, getRoom, initNewRoom, newRoomId } from "../utils/roomStore";

export default defineWebSocketHandler({
    open(peer) {
        console.log(`[ws] New connection: ${peer.id}`);
    },

    close(peer) {
        console.log(`[ws] Connection closed: ${peer.id}`);
        const roomId = getUserRoomId(peer.id);
        if (roomId) {
            peer.publish(roomId, {
                type: MessageType.leaveRoom,
                userId: peer.id,
                roomId: roomId,
            } satisfies Message);

            const gameState = getRoom(roomId);
            if ((gameState?.players?.length ?? 0) < 1) {
                closeRoom(roomId);
            }
        }
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
                const roomId = newRoomId();
                initNewRoom(roomId, {
                    id: peer.id,
                    name: "",
                    score: 0,
                });
                peer.send({});

                // Subscribe to the new room topic
                peer.subscribe(roomId);
                addUserToRoom(peer.id, roomId);
                break;

            case MessageType.joinRoom:
                // 1. Unsubscribe from old rooms if necessary
                const oldRoom = getUserRoomId(peer.id);
                if (oldRoom) {
                    peer.unsubscribe(oldRoom);
                    removeUserFromRoom(oldRoom);
                }
                // 2. Subscribe to the new room topic
                peer.subscribe(data.roomId);
                addUserToRoom(peer.id, data.roomId);

                // Notify others in the room that someone joined
                peer.publish(data.roomId, {
                    type: MessageType.joinRoom,
                    userId: peer.id,
                    roomId: data.roomId,
                } satisfies Message);
                break;

            case MessageType.leaveRoom:
                // Remove them
                peer.unsubscribe(data.roomId);
                removeUserFromRoom(data.roomId);

                // Let the room know
                peer.publish(data.roomId, {
                    type: MessageType.leaveRoom,
                    userId: peer.id,
                    roomId: data.roomId,
                } satisfies Message);
                break;
        }
    },
});
