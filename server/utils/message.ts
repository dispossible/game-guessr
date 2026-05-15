import { Peer } from "crossws";
import { type Message } from "#shared/types/Message";

// crossws sends non-string payloads as binary frames, which the browser then
// delivers as a Blob. Stringify here so clients always receive text JSON.
export function sendMessage(peer: Peer, message: Message) {
    peer.send(JSON.stringify(message));
}

export function publishMessage(peer: Peer, channel: string, message: Message) {
    peer.publish(channel, JSON.stringify(message));
}
