// lib/chatCrypto.js
// Helper enkripsi sisi client (WebCrypto). Private key TIDAK PERNAH keluar dari perangkat.
// Hanya boleh dipanggil di browser (useEffect / event handler), bukan di getServerSideProps.

const DB_NAME = "chat-crypto"
const STORE = "keys"

/* ---------- base64 helpers (aman untuk data besar) ---------- */
export const bytesToB64 = (buf) => {
    const bytes = new Uint8Array(buf)
    let bin = ""
    for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return btoa(bin)
}
export const b64ToBytes = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0))

/* ---------- IndexedDB: simpan CryptoKey non-extractable ---------- */
const openDb = () =>
    new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(STORE)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })

const idbGet = async (key) => {
    const db = await openDb()
    return new Promise((resolve, reject) => {
        const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key)
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
    })
}

const idbSet = async (key, value) => {
    const db = await openDb()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

const keyName = (myHash) => `keypair:${myHash}`

/* ---------- keypair ---------- */
const generateKeyPair = async () => {
    const pair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        false, // private key tidak bisa diexport; public key tetap bisa
        ["encrypt", "decrypt"]
    )
    const spki = await crypto.subtle.exportKey("spki", pair.publicKey)
    return { privateKey: pair.privateKey, publicKeyB64: bytesToB64(spki) }
}

/**
 * Pastikan perangkat ini punya keypair yang cocok dengan public key di server.
 *
 * @param myHash          hash address user yang login
 * @param serverPublicKey publicKey user di server (dari dataUser), null kalau belum ada
 * @param uploadPublicKey async (publicKeyB64) => upload ke PUT /users/publickey (lempar error kalau gagal)
 *
 * status:
 *  - "ready"    : siap dipakai (privateKey ikut dikembalikan)
 *  - "missing"  : server sudah punya public key tapi perangkat ini tidak punya private key-nya
 *  - "mismatch" : perangkat punya private key, tapi public key di server berbeda
 *                 (kemungkinan diganti dari perangkat lain)
 * Untuk "missing"/"mismatch" kita TIDAK menimpa otomatis; user harus memilih lewat resetKeyPair().
 */
export const ensureKeyPair = async (myHash, serverPublicKey, uploadPublicKey) => {
    const local = await idbGet(keyName(myHash))

    if (local) {
        if (serverPublicKey === local.publicKeyB64) {
            return { status: "ready", privateKey: local.privateKey }
        }
        if (!serverPublicKey) {
            await uploadPublicKey(local.publicKeyB64)
            return { status: "ready", privateKey: local.privateKey }
        }
        return { status: "mismatch" }
    }

    if (serverPublicKey) return { status: "missing" }

    const { privateKey, publicKeyB64 } = await generateKeyPair()
    await idbSet(keyName(myHash), { privateKey, publicKeyB64 })
    await uploadPublicKey(publicKeyB64)
    return { status: "ready", privateKey }
}

/** Buat keypair baru & timpa yang di server. Pesan lama tidak akan bisa dibaca lagi. */
export const resetKeyPair = async (myHash, uploadPublicKey) => {
    const { privateKey, publicKeyB64 } = await generateKeyPair()
    await uploadPublicKey(publicKeyB64)
    await idbSet(keyName(myHash), { privateKey, publicKeyB64 })
    return privateKey
}

/* ---------- fingerprint (untuk verifikasi manual) ---------- */
export const fingerprint = async (publicKeyB64) => {
    const hash = await crypto.subtle.digest("SHA-256", b64ToBytes(publicKeyB64))
    const hex = [...new Uint8Array(hash)]
        .slice(0, 16)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    return hex.match(/.{4}/g).join(" ")
}

/* ---------- enkripsi / dekripsi pesan ---------- */
const importPublicKey = (spkiB64) =>
    crypto.subtle.importKey(
        "spki",
        b64ToBytes(spkiB64),
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
    )

/**
 * publicKeys = { [userId]: publicKeyB64 } untuk SEMUA peserta (termasuk diri sendiri).
 * Hasilnya langsung jadi body POST /chats/:chatId/messages.
 */
export const encryptMessage = async (plaintext, publicKeys) => {
    const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"])
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        new TextEncoder().encode(plaintext)
    )
    const rawAes = await crypto.subtle.exportKey("raw", aesKey)

    const keys = {}
    for (const [userId, spki] of Object.entries(publicKeys)) {
        const pub = await importPublicKey(spki)
        keys[userId] = bytesToB64(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, rawAes))
    }

    return { ciphertext: bytesToB64(ciphertext), iv: bytesToB64(iv), keys }
}

/**
 * msg = { ciphertext, iv, key } ; `key` adalah kunci AES yang sudah dienkripsi untuk kita.
 * Mengembalikan string, atau null kalau gagal didekripsi.
 */
export const decryptMessage = async (msg, privateKey) => {
    try {
        if (!msg?.key || !msg?.ciphertext || !msg?.iv || !privateKey) return null
        const rawAes = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, b64ToBytes(msg.key))
        const aesKey = await crypto.subtle.importKey("raw", rawAes, "AES-GCM", false, ["decrypt"])
        const plain = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: b64ToBytes(msg.iv) },
            aesKey,
            b64ToBytes(msg.ciphertext)
        )
        return new TextDecoder().decode(plain)
    } catch {
        return null
    }
}

/**
 * Bungkus ulang kunci AES sebuah pesan (milik kita) untuk public key orang lain.
 * msg.key = kunci AES yang dienkripsi untuk kita. Mengembalikan base64, atau null kalau gagal.
 */
export const rewrapKey = async (msg, privateKey, otherPublicKeyB64) => {
    try {
        if (!msg?.key || !privateKey) return null
        const rawAes = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, b64ToBytes(msg.key))
        const pub = await importPublicKey(otherPublicKeyB64)
        return bytesToB64(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, rawAes))
    } catch {
        return null
    }
}

/**
 * Untuk halaman daftar chat: dekripsi chat.lastMessage.
 * lastMessage menyimpan `keys` lengkap, jadi ambil keys[myHash].
 * Mengembalikan teks, "" kalau belum ada pesan, atau null kalau tidak bisa didekripsi.
 */
export const decryptPreview = async (chat, myHash, privateKey) => {
    const last = chat?.lastMessage
    if (!last) return ""
    if (!last.encrypted) return last.text ?? ""
    return decryptMessage({ ...last, key: last.keys?.[myHash] }, privateKey)
}

/** Ambil private key lokal tanpa membuat apa pun (untuk halaman lain, mis. daftar chat). */
export const getLocalPrivateKey = async (myHash) => {
    const local = await idbGet(keyName(myHash))
    return local?.privateKey || null
}