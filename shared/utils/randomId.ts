const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateRandomId(length: number) {
    let result = "";
    for (let i = 0; i < length; i++) {
        result += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
    }
    return result;
}
