import callApi from "@/lib/api";

const ROOT_API = "http://localhost:8000"

export async function listChats() {
    const url = `${ROOT_API}/chat/chats`
    return callApi({
        url,
        method: "GET",
        token: true
    })
}

export async function openChat(data) {
    const url = `${ROOT_API}/chat/chats`
    return callApi({
        url,
        method: "POST",
        token: true,
        data
    })
}

export async function getMessages(chatId) {
    const url = `${ROOT_API}/chat/chats/${chatId}/messages`
    return callApi({
        url,
        method: "GET",
        token: true
    })
}

// data = { ciphertext, iv, keys }  (hasil encryptMessage)
export async function sendMessage(chatId, data) {
    const url = `${ROOT_API}/chat/chats/${chatId}/messages`
    return callApi({
        url,
        method: "POST",
        token: true,
        data
    })
}

export async function markRead(chatId) {
    const url = `${ROOT_API}/chat/chats/${chatId}/read`
    return callApi({
        url,
        method: "PUT",
        token: true
    })
}

// data = { userId, key }  -> melengkapi kunci pesan untuk lawan bicara yang tadinya belum punya public key
export async function addMessageKey(chatId, messageId, data) {
    const url = `${ROOT_API}/chat/chats/${chatId}/messages/${messageId}/key`
    return callApi({
        url,
        method: "PUT",
        token: true,
        data
    })
}

// FIX: sebelumnya tidak menerima parameter chatId
export async function getChatKeys(chatId) {
    const url = `${ROOT_API}/chat/chats/${chatId}/keys`
    return callApi({
        url,
        method: "GET",
        token: true
    })
}