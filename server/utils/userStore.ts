const userStore = new Map<string, string>();

export function addUserToRoom(userId: string, roomId: string) {
    userStore.set(userId, roomId);
}

export function removeUserFromRoom(userId: string) {
    userStore.delete(userId);
}

export function getUserRoomId(userId: string): string | undefined {
    return userStore.get(userId);
}
