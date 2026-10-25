"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Cookies from "js-cookie"
import { jwtDecode } from "jwt-decode"
import ConnectWallet from "@/components/connectWallet"
import { listChats } from "@/services/chat"
import { dataUser } from "@/services/user"
import { decryptPreview, getLocalPrivateKey } from "@/lib/chatCrypto"

const POLL_MS = 4000 // interval refresh daftar chat

const ChatSkeleton = () => (
    <div className="flex items-center gap-3 px-2 py-2.5 animate-pulse">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
    </div>
)

const ListChats = () => {
    const [chats, setChats] = useState([])
    const [loading, setLoading] = useState(true)
    const [keyword, setKeyword] = useState("")
    const [filter, setFilter] = useState("all")
    const [myHash, setMyHash] = useState("")
    const [profiles, setProfiles] = useState({})
    const [previews, setPreviews] = useState({}) // chatId -> teks preview (sudah didekripsi) / null kalau tidak terbaca
    const [keyReady, setKeyReady] = useState(false)

    const privateKeyRef = useRef(null)
    const previewCache = useRef(new Map()) // chatId -> { sig, text }

    useEffect(() => {
        const token = Cookies.get("token")
        if (token) {
            try {
                setMyHash(jwtDecode(atob(token)).hash)
            } catch (err) {
                console.error(err)
            }
        }
    }, [])

    // Ambil daftar chat sekarang, lalu refresh otomatis tiap POLL_MS (berhenti saat tab tidak aktif)
    useEffect(() => {
        let active = true
        let busy = false

        const fetchChats = async () => {
            if (busy) return
            busy = true
            try {
                const res = await listChats()
                if (!active || !res || res.error) return // request gagal: jangan kosongkan daftar yang sudah ada
                const data = res?.data?.data || res?.data
                if (Array.isArray(data)) setChats(data)
            } catch (err) {
                console.error(err)
            } finally {
                busy = false
                if (active) setLoading(false)
            }
        }

        const onVisible = () => {
            if (document.visibilityState === "visible") fetchChats()
        }

        fetchChats()
        const timer = setInterval(onVisible, POLL_MS)
        document.addEventListener("visibilitychange", onVisible)

        return () => {
            active = false
            clearInterval(timer)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [])

    // Private key lokal (untuk mendekripsi preview pesan terakhir)
    useEffect(() => {
        if (!myHash) return
        let active = true

        getLocalPrivateKey(myHash)
            .then((key) => {
                if (!active) return
                privateKeyRef.current = key
                setKeyReady(true)
            })
            .catch((err) => {
                console.error(err)
                if (active) setKeyReady(true) // preview akan tampil sebagai "Encrypted message"
            })

        return () => { active = false }
    }, [myHash])

    // Dekripsi preview pesan terakhir (hanya yang baru atau yang kuncinya berubah)
    useEffect(() => {
        if (!myHash || !keyReady || chats.length === 0) return
        let active = true

        ;(async () => {
            for (const c of chats) {
                const last = c.lastMessage
                if (!last) continue

                const keyForMe = last.keys?.[myHash]
                const sig = `${last.messageId || toDate(last.createdAt)?.getTime() || ""}:${keyForMe ? keyForMe.slice(0, 24) : "none"}`
                if (previewCache.current.get(c.id)?.sig === sig) continue

                let text = null
                try {
                    text = await decryptPreview(c, myHash, privateKeyRef.current)
                } catch (err) {
                    console.error(err)
                }
                previewCache.current.set(c.id, { sig, text })
            }

            if (!active) return

            const next = {}
            previewCache.current.forEach((v, id) => { next[id] = v.text })
            setPreviews((prev) => {
                const keys = Object.keys(next)
                const same = keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k])
                return same ? prev : next
            })
        })()

        return () => { active = false }
    }, [chats, myHash, keyReady])

    useEffect(() => {
        if (!myHash || chats.length === 0) return

        const ids = [
            ...new Set(chats.map((c) => c.participants?.find((p) => p !== myHash)).filter(Boolean)),
        ].filter((id) => !(id in profiles))
        if (ids.length === 0) return

        let active = true
        Promise.all(
            ids.map(async (id) => {
                try {
                    const res = await dataUser(id)
                    return [id, res?.data ?? null]
                } catch {
                    return [id, null]
                }
            })
        ).then((results) => {
            if (!active) return
            setProfiles((prev) => ({ ...prev, ...Object.fromEntries(results) }))
        })

        return () => { active = false }
    }, [chats, myHash])

    const truncateAddress = (address, start = 6, end = 12) => {
        if (!address) return ""
        if (address.length <= start + end) return address
        return `${address.slice(0, start)}...${address.slice(-end)}`
    }

    const toDate = (ts) => {
        const s = ts?._seconds ?? ts?.seconds
        return s ? new Date(s * 1000) : null
    }
    const isUnread = (c) => {
        const last = toDate(c.lastMessage?.createdAt)
        const read = toDate(c.lastReadAt?.[myHash])
        return !!last && c.lastMessage?.senderId !== myHash && (!read || last > read)
    }
    const otherOf = (c) => c.participants?.find((p) => p !== myHash) || ""
    const nameOf = (c) => {
        const id = otherOf(c)
        return profiles[id]?.displayName || truncateAddress(id)
    }
    const initialOf = (c) => {
        const name = profiles[otherOf(c)]?.displayName
        return name ? name.charAt(0).toUpperCase() : "?"
    }

    const previewOf = (c) => {
        if (!c.lastMessage) return "Mulai percakapan"
        const p = previews[c.id]
        if (p === undefined) return "" // masih didekripsi
        if (p === null) return "Encrypted message" // tidak bisa dibaca di perangkat ini
        return p
    }

    const unreadCount = chats.filter(isUnread).length
    const shown = chats
        .filter((c) => (filter === "unread" ? isUnread(c) : true))
        .filter((c) => nameOf(c).toLowerCase().includes(keyword.toLowerCase()))

    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="w-full md:w-2/3 border-0 md:border-r dark:border-gray-700 px-2 text-gray-900 dark:text-white transition-colors">
                <div className="flex flex-col gap-3 py-3">
                    <h1 className="text-center text-xl font-semibold dark:text-white">Chats</h1>

                    <div className="flex items-center gap-3 rounded-full bg-gray-100 dark:bg-gray-800 dark:border dark:border-gray-600 dark:shadow-md dark:shadow-black/40 px-4 py-3 transition-colors">
                        <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
                        </svg>
                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Cari pesan"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-400"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter("all")}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${filter === "all" ? "border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-400 dark:bg-blue-500/30 dark:text-blue-100" : "border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-300"}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${filter === "unread" ? "border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-400 dark:bg-blue-500/30 dark:text-blue-100" : "border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-300"}`}
                        >
                            Unread <span className="ml-1">{unreadCount}</span>
                        </button>
                    </div>

                    <div className="border-t dark:border-gray-700">
                        {loading && (
                            <>
                                <ChatSkeleton />
                                <ChatSkeleton />
                                <ChatSkeleton />
                                <ChatSkeleton />
                            </>
                        )}

                        {!loading && shown.length === 0 && (
                            <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-300">Belum ada chat</p>
                        )}

                        {!loading && shown.map((c) => {
                            const unread = isUnread(c)
                            const time = toDate(c.lastMessage?.createdAt)
                            return (
                                <Link
                                    key={c.id}
                                    href={`/chat/${c.id}`}
                                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                                >
                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 dark:shadow-black/40 ${unread ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" : ""}`}
                                    >
                                        <span className="text-sm font-semibold text-white">
                                            {initialOf(c)}
                                        </span>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className={`truncate font-semibold text-[13px] ${unread ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-800 dark:text-gray-100"}`}>
                                                {nameOf(c)}
                                            </p>
                                            <span className={`shrink-0 text-[11px] tabular-nums ${unread ? "font-medium text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-300"}`}>
                                                {time ? time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}
                                            </span>
                                        </div>

                                        <div className="mt-0.5 flex items-center justify-between gap-2">
                                            <p className={`truncate text-xs ${unread ? "font-medium text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-300"}`}>
                                                {previewOf(c)}
                                            </p>
                                            {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default ListChats