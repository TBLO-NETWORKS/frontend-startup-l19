import Link from "next/link"
import Cookies from "js-cookie"
import { jwtDecode } from "jwt-decode"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import ConnectWallet from "@/components/connectWallet"
import { getMessages, sendMessage, markRead, getChatKeys, addMessageKey } from "@/services/chat"
import { dataUser, setPublicKey } from "@/services/user"
import {
    ensureKeyPair,
    resetKeyPair,
    encryptMessage,
    decryptMessage,
    fingerprint,
    rewrapKey,
} from "@/lib/chatCrypto"

const MAX_CHARS = 4000 // jaga ciphertext tetap di bawah batas server (16KB base64)

const truncateAddress = (address, start = 6, end = 12) => {
    if (!address) return ""
    if (address.length <= start + end) return address
    return `${address.slice(0, start)}...${address.slice(-end)}`
}

const toDate = (ts) => {
    if (!ts) return null
    if (typeof ts === "string" || typeof ts === "number") return new Date(ts)
    const s = ts._seconds ?? ts.seconds
    return s ? new Date(s * 1000) : null
}

const formatTime = (d) =>
    d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""

const formatDay = (d) =>
    d ? d.toLocaleDateString("en-US", { day: "numeric", month: "long" }) : ""

const dayKey = (d) => (d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "")

const uploadPublicKey = async (publicKey) => {
    const res = await setPublicKey(publicKey)
    if (!res) throw new Error("Failed to upload public key")
}

const DetailChat = () => {
    const router = useRouter()
    const { chatId } = router.query

    const [myHash, setMyHash] = useState("")
    const [otherUser, setOtherUser] = useState(null)
    const [messages, setMessages] = useState([])
    const [text, setText] = useState("")
    const [sending, setSending] = useState(false)

    // ---- state enkripsi ----
    // keyState: loading | ready | missing | mismatch | error
    const [keyState, setKeyState] = useState("loading")
    const [otherNoKey, setOtherNoKey] = useState(false)
    const [otherFp, setOtherFp] = useState("")
    const [keyChanged, setKeyChanged] = useState(false)

    const privateKeyRef = useRef(null)
    const plainCache = useRef(new Map()) // id pesan -> teks hasil dekripsi
    const keysCacheRef = useRef({ at: 0, keys: null }) // cache public key peserta chat
    const pendingRef = useRef([]) // pesan optimistic yang belum muncul dari server
    const rewrapBusy = useRef(false)

    const KEYS_TTL = 60_000
    const getKeys = async () => {
        const c = keysCacheRef.current
        if (c.keys && Date.now() - c.at < KEYS_TTL) return c.keys

        const res = await getChatKeys(chatId)
        const keys = res?.data?.publicKeys || null
        if (keys) keysCacheRef.current = { at: Date.now(), keys }
        return keys
    }

    const bottomRef = useRef(null)
    const lastMarkedRef = useRef("")

    // tunggu myHash siap; kalau tidak, hash milik sendiri bisa terambil sebagai "lawan bicara"
    const otherHash = chatId && myHash ? String(chatId).split("_").find((h) => h !== myHash) : ""
    // lawan bicara yang belum punya kunci TIDAK memblokir pengiriman
    const canSend = keyState === "ready" && !keyChanged

    useEffect(() => {
        const token = Cookies.get("token")
        if (token) {
            try {
                const payload = jwtDecode(atob(token))
                setMyHash(payload.hash)
            } catch (err) {
                console.error(err)
            }
        }
    }, [])

    useEffect(() => {
        setOtherUser(null) // jangan tampilkan data lawan bicara sebelumnya
        if (!otherHash) return
        let active = true

        dataUser(otherHash).then((res) => {
            if (active && res) setOtherUser(res.data)
        })

        return () => {
            active = false
        }
    }, [otherHash])

    // 1) Siapkan keypair perangkat ini (buat + upload public key kalau belum ada)
    useEffect(() => {
        if (!myHash) return
        let active = true

        ;(async () => {
            try {
                const me = await dataUser(myHash)
                const result = await ensureKeyPair(myHash, me?.data?.publicKey || null, uploadPublicKey)
                if (!active) return

                if (result.status === "ready") {
                    privateKeyRef.current = result.privateKey
                    setKeyState("ready")
                } else {
                    setKeyState(result.status) // missing | mismatch
                }
            } catch (err) {
                console.error(err)
                if (active) setKeyState("error")
            }
        })()

        return () => {
            active = false
        }
    }, [myHash])

    // 2) Cek public key lawan bicara + deteksi perubahan kunci (trust on first use)
    useEffect(() => {
        if (!chatId || !otherHash || keyState !== "ready") return
        let active = true

        ;(async () => {
            const res = await getChatKeys(chatId)
            const otherKey = res?.data?.publicKeys?.[otherHash]
            if (!active) return

            if (res?.data?.publicKeys) {
                keysCacheRef.current = { at: Date.now(), keys: res.data.publicKeys }
            }

            if (!otherKey) {
                setOtherNoKey(true)
                return
            }

            setOtherNoKey(false)
            const fp = await fingerprint(otherKey)
            if (!active) return
            setOtherFp(fp)

            const trusted = localStorage.getItem(`fp:${otherHash}`)
            if (!trusted) {
                localStorage.setItem(`fp:${otherHash}`, fp)
            } else if (trusted !== fp) {
                setKeyChanged(true)
            }
        })()

        return () => {
            active = false
        }
    }, [chatId, otherHash, keyState])

    // 3) Ambil + dekripsi pesan (polling)
    useEffect(() => {
        if (!chatId || !myHash || keyState !== "ready") return
        let active = true

        const decodeAll = (rows) =>
            Promise.all(
                rows.map(async (m) => {
                    if (!m.encrypted) return { ...m, plain: m.text ?? "" } // pesan lama (belum terenkripsi)
                    if (plainCache.current.has(m.id)) return { ...m, plain: plainCache.current.get(m.id) }

                    const plain = await decryptMessage(m, privateKeyRef.current)
                    if (plain !== null) plainCache.current.set(m.id, plain)
                    return { ...m, plain }
                })
            )

        // Lengkapi kunci pesan-pesan KITA yang tadinya belum bisa dibuka lawan bicara
        const rewrapPending = async (list) => {
            if (rewrapBusy.current) return

            const todo = list.filter(
                (m) =>
                    m.senderId === myHash &&
                    m.encrypted &&
                    m.key &&
                    (m.missingKeyFor || []).includes(otherHash)
            )
            if (todo.length === 0) return

            rewrapBusy.current = true
            try {
                const keys = await getKeys() // memakai cache; refresh otomatis tiap 60 detik
                const otherKey = keys?.[otherHash]
                if (!otherKey) return // lawan bicara masih belum aktif

                const fp = await fingerprint(otherKey)
                const trusted = localStorage.getItem(`fp:${otherHash}`)
                if (trusted && trusted !== fp) {
                    setOtherFp(fp)
                    setKeyChanged(true)
                    return
                }
                if (!trusted) localStorage.setItem(`fp:${otherHash}`, fp)
                setOtherFp(fp)
                setOtherNoKey(false)

                for (const m of todo) {
                    const wrapped = await rewrapKey(m, privateKeyRef.current, otherKey)
                    if (!wrapped) continue
                    await addMessageKey(chatId, m.id, { userId: otherHash, key: wrapped })
                }
            } catch (err) {
                console.error(err)
            } finally {
                rewrapBusy.current = false
            }
        }

        const fetchMessages = async () => {
            const res = await getMessages(chatId)
            if (!active || !res) return

            const serverList = await decodeAll([...(res.data || [])].reverse())
            if (!active) return

            // pesan optimistic yang sudah ada di server dibuang; sisanya tetap ditampilkan
            const serverIds = new Set(serverList.map((m) => m.id))
            pendingRef.current = pendingRef.current.filter((p) => !serverIds.has(p.id))
            const list = [...serverList, ...pendingRef.current]
            setMessages(list)

            const last = list[list.length - 1]
            if (last && last.senderId !== myHash && lastMarkedRef.current !== last.id) {
                lastMarkedRef.current = last.id
                markRead(chatId)
            }

            rewrapPending(serverList)
        }

        fetchMessages()
        const timer = setInterval(fetchMessages, 5000)
        return () => {
            active = false
            clearInterval(timer)
        }
    }, [chatId, myHash, keyState])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages.length])

    const handleResetKey = async () => {
        const ok = window.confirm(
            "Membuat kunci baru akan membuat pesan lama TIDAK bisa dibaca lagi di semua perangkat. Lanjutkan?"
        )
        if (!ok) return

        try {
            privateKeyRef.current = await resetKeyPair(myHash, uploadPublicKey)
            plainCache.current.clear()
            setKeyState("ready")
            toast.success("Kunci enkripsi baru dibuat")
        } catch (err) {
            console.error(err)
            toast.error("Gagal membuat kunci baru")
        }
    }

    const handleTrustNewKey = () => {
        localStorage.setItem(`fp:${otherHash}`, otherFp)
        setKeyChanged(false)
    }

    const handleSend = async (e) => {
        e.preventDefault()
        const value = text.trim()
        if (!value || sending || !canSend) return

        setSending(true)
        let tempId = null
        try {
            // public key diambil dari cache (hanya request ke server kalau cache sudah kedaluwarsa)
            const publicKeys = await getKeys()
            if (!publicKeys?.[myHash]) {
                toast.error("Kunci enkripsi kamu belum siap")
                return
            }

            // kalau lawan bicara sudah punya kunci, pastikan belum berubah sejak terakhir dipercaya
            if (publicKeys[otherHash]) {
                const fp = await fingerprint(publicKeys[otherHash])
                const trusted = localStorage.getItem(`fp:${otherHash}`)
                if (trusted && trusted !== fp) {
                    setOtherFp(fp)
                    setKeyChanged(true)
                    toast.error("Kunci keamanan lawan bicara berubah")
                    return
                }
            }

            // tampilkan pesan langsung (optimistic), jangan tunggu server
            tempId = `tmp-${Date.now()}`
            const optimistic = {
                id: tempId,
                senderId: myHash,
                plain: value,
                createdAt: Date.now(),
                replyTo: null,
                deletedAt: null,
            }
            pendingRef.current = [...pendingRef.current, optimistic]
            setMessages((prev) => [...prev, optimistic])
            setText("")

            const payload = await encryptMessage(value, publicKeys)
            const res = await sendMessage(chatId, payload)
            if (!res) throw new Error("send failed")

            // ganti id sementara dengan id asli; plaintext di-cache supaya tidak perlu didekripsi lagi
            const realId = res.data?.id
            if (realId) {
                plainCache.current.set(realId, value)
                pendingRef.current = pendingRef.current.map((p) => (p.id === tempId ? { ...p, id: realId } : p))
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: realId } : m)))
            }
        } catch (err) {
            console.error(err)
            toast.error("Failed to send message")
            if (tempId) {
                // gagal: tarik kembali pesan optimistic dan kembalikan teks ke input
                pendingRef.current = pendingRef.current.filter((p) => p.id !== tempId)
                setMessages((prev) => prev.filter((m) => m.id !== tempId))
                setText(value)
            }
        } finally {
            setSending(false)
        }
    }

    const displayName = otherUser?.displayName || truncateAddress(otherHash)

    const renderText = (m) => {
        if (m.deletedAt) return "Pesan dihapus"
        if (m.plain === null || m.plain === undefined) {
            if ((m.missingKeyFor || []).includes(myHash)) {
                return "⏳ Pesan ini akan terbuka setelah pengirim membuka chat ini lagi"
            }
            return "🔒 Pesan tidak bisa didekripsi di perangkat ini"
        }
        return m.plain
    }

    const isUnreadable = (m) => !m.deletedAt && (m.plain === null || m.plain === undefined)

    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="flex h-screen w-full flex-col border-0 px-2 md:w-2/3 md:border-r dark:border-gray-700 text-gray-900 dark:text-white transition-colors">
                <div className="grid grid-cols-[2rem_1fr_2rem] items-center border-b border-gray-100 dark:border-gray-700 py-3">
                    <button onClick={() => router.back()} aria-label="Back" className="cursor-pointer text-gray-900 dark:text-white">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <Link href={otherHash ? `/${otherHash}` : "#"} className="flex items-center justify-center gap-1 truncate">
                        <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName}</h1>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>

                    <span />
                </div>

                {/* ---- banner status enkripsi ---- */}
                {keyState === "ready" && !otherNoKey && !keyChanged && otherFp && (
                    <p className="py-1 text-center text-[11px] text-gray-400 dark:text-gray-300" title="Bandingkan kode ini dengan lawan bicara untuk memastikan chat aman">
                        🔒 Terenkripsi end-to-end · kode keamanan: {otherFp}
                    </p>
                )}

                {(keyState === "missing" || keyState === "mismatch") && (
                    <div className="my-2 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                        <p>
                            {keyState === "missing"
                                ? "Perangkat ini belum memiliki kunci enkripsi akun kamu, jadi pesan tidak bisa dibaca atau dikirim dari sini."
                                : "Kunci enkripsi di server berbeda dengan yang ada di perangkat ini (mungkin diganti dari perangkat lain)."}
                        </p>
                        <button onClick={handleResetKey} className="mt-2 cursor-pointer font-semibold underline">
                            Buat kunci baru di perangkat ini
                        </button>
                    </div>
                )}

                {keyState === "error" && (
                    <div className="my-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-200">
                        Gagal menyiapkan enkripsi. Muat ulang halaman, lalu coba lagi.
                    </div>
                )}

                {otherNoKey && (
                    <div className="my-2 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                        chat encrypted with end to end encryption
                    </div>
                )}

                {keyChanged && (
                    <div className="my-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-200">
                        <p>
                            Kode keamanan {displayName} berubah (kode baru: {otherFp}). Bisa jadi dia ganti perangkat, tapi
                            konfirmasi dulu lewat jalur lain sebelum melanjutkan.
                        </p>
                        <button onClick={handleTrustNewKey} className="mt-2 cursor-pointer font-semibold underline">
                            Saya sudah verifikasi, percayai kunci baru
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto py-3">
                    {messages.length === 0 && (
                        <p className="py-10 text-center text-xs text-gray-400 dark:text-gray-300">Belum ada pesan, mulai percakapan!</p>
                    )}

                    {messages.map((m, i) => {
                        const mine = m.senderId === myHash
                        const date = toDate(m.createdAt)
                        const prev = messages[i - 1]
                        const next = messages[i + 1]
                        const nextDate = toDate(next?.createdAt)

                        const newDay = !prev || dayKey(toDate(prev.createdAt)) !== dayKey(date)
                        const showTime =
                            !next ||
                            next.senderId !== m.senderId ||
                            dayKey(nextDate) !== dayKey(date) ||
                            formatTime(nextDate) !== formatTime(date)

                        const replied = m.replyTo ? messages.find((x) => x.id === m.replyTo) : null

                        return (
                            <div key={m.id}>
                                {newDay && (
                                    <p className="my-4 text-center text-[11px] font-medium text-gray-400 dark:text-gray-300">
                                        {formatDay(date)}
                                    </p>
                                )}

                                <div className={`flex flex-col px-1 ${mine ? "items-end" : "items-start"} ${showTime ? "mb-3" : "mb-1"}`}>
                                    {replied && (
                                        <div className="mb-1 flex max-w-[80%] items-stretch gap-2">
                                            <span className="w-0.5 rounded-full bg-blue-300 dark:bg-blue-400" />
                                            <p className="truncate text-xs text-gray-400 dark:text-gray-300">{replied.plain ?? ""}</p>
                                        </div>
                                    )}

                                    <div className={`flex max-w-[80%] items-stretch gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                                        <span className={`w-1 shrink-0 rounded-full ${mine ? "bg-blue-500" : "bg-gray-900 dark:bg-white"}`} />
                                        <p className={`whitespace-pre-wrap break-words py-0.5 text-[13px] leading-snug ${mine ? "text-right" : "text-left"} ${m.deletedAt || isUnreadable(m) ? "italic text-gray-400 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
                                            {renderText(m)}
                                        </p>
                                    </div>

                                    {showTime && (
                                        <span className={`mt-1 text-[11px] tabular-nums text-gray-400 dark:text-gray-300 ${mine ? "pr-3" : "pl-3"}`}>
                                            {formatTime(date)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    <div ref={bottomRef} />
                </div>

                <form onSubmit={handleSend} className="flex items-center gap-3 rounded-full bg-gray-100 dark:bg-gray-800 dark:border dark:border-gray-600 dark:shadow-md dark:shadow-black/40 px-4 py-2.5 mb-3 transition-colors">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={MAX_CHARS}
                        disabled={!canSend}
                        placeholder={canSend ? "Kirim.." : keyState === "loading" ? "Menyiapkan enkripsi.." : `Pengiriman dinonaktifkan (${keyChanged ? "kode keamanan berubah" : keyState})`}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-gray-400"
                    />

                    {text.trim() ? (
                        <button type="submit" disabled={sending || !canSend} aria-label="Send" className="cursor-pointer text-blue-500 dark:text-blue-400 disabled:opacity-50">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 2L11 13" />
                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                        </button>
                    ) : (
                        <div className="flex shrink-0 items-center gap-3 text-gray-900 dark:text-white">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="3" />
                                <circle cx="9" cy="9" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                            </svg>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="9" y="2" width="6" height="12" rx="3" />
                                <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
                            </svg>
                        </div>
                    )}
                </form>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default DetailChat