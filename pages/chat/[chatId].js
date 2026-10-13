import Link from "next/link"
import Cookies from "js-cookie"
import { jwtDecode } from "jwt-decode"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import ConnectWallet from "@/components/connectWallet"
import { getMessages, sendMessage, markRead } from "@/services/chat"
import { dataUser } from "@/services/user"

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

const DetailChat = () => {
    const router = useRouter()
    const { chatId } = router.query

    const [myHash, setMyHash] = useState("")
    const [otherUser, setOtherUser] = useState(null)
    const [messages, setMessages] = useState([])
    const [text, setText] = useState("")
    const [sending, setSending] = useState(false)

    const bottomRef = useRef(null)
    const lastMarkedRef = useRef("")

    const otherHash = chatId ? String(chatId).split("_").find((h) => h !== myHash) : ""

    // ambil hash user login dari token
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

    // data lawan bicara untuk header
    useEffect(() => {
        if (!otherHash) return
        dataUser(otherHash).then((res) => {
            if (res) setOtherUser(res.data)
        })
    }, [otherHash])

    // ambil pesan + polling tiap 5 detik
    useEffect(() => {
        if (!chatId || !myHash) return
        let active = true

        const fetchMessages = async () => {
            const res = await getMessages(chatId)
            if (!active || !res) return

            // backend mengirim terbaru dulu, dibalik agar urut lama -> baru
            const list = [...(res.data || [])].reverse()
            setMessages(list)

            const last = list[list.length - 1]
            if (last && last.senderId !== myHash && lastMarkedRef.current !== last.id) {
                lastMarkedRef.current = last.id
                markRead(chatId)
            }
        }

        fetchMessages()
        const timer = setInterval(fetchMessages, 5000)
        return () => {
            active = false
            clearInterval(timer)
        }
    }, [chatId, myHash])

    // scroll ke bawah saat ada pesan baru
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages.length])

    const handleSend = async (e) => {
        e.preventDefault()
        const value = text.trim()
        if (!value || sending) return

        setSending(true)
        const res = await sendMessage(chatId, { text: value })
        setSending(false)

        if (!res) {
            toast.error("Failed to send message")
            return
        }

        setText("")
        const refreshed = await getMessages(chatId)
        if (refreshed) setMessages([...(refreshed.data || [])].reverse())
    }

    const displayName = otherUser?.displayName || truncateAddress(otherHash)

    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="flex h-screen w-full flex-col border-0 px-2 md:w-2/3 md:border-r">
                {/* header */}
                <div className="grid grid-cols-[2rem_1fr_2rem] items-center border-b border-gray-100 py-3">
                    <button onClick={() => router.back()} aria-label="Back" className="cursor-pointer text-gray-900">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <Link href={otherHash ? `/${otherHash}` : "#"} className="flex items-center justify-center gap-1 truncate">
                        <h1 className="truncate text-sm font-semibold text-gray-900">{displayName}</h1>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>

                    <span />
                </div>

                {/* daftar pesan */}
                <div className="flex-1 overflow-y-auto py-3">
                    {messages.length === 0 && (
                        <p className="py-10 text-center text-xs text-gray-400">Belum ada pesan, mulai percakapan!</p>
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
                                    <p className="my-4 text-center text-[11px] font-medium text-gray-400">
                                        {formatDay(date)}
                                    </p>
                                )}

                                <div className={`flex flex-col px-1 ${mine ? "items-end" : "items-start"} ${showTime ? "mb-3" : "mb-1"}`}>
                                    {replied && (
                                        <div className="mb-1 flex max-w-[80%] items-stretch gap-2">
                                            <span className="w-0.5 rounded-full bg-blue-300" />
                                            <p className="truncate text-xs text-gray-400">{replied.text}</p>
                                        </div>
                                    )}

                                    <div className={`flex max-w-[80%] items-stretch gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                                        <span className={`w-1 shrink-0 rounded-full ${mine ? "bg-blue-500" : "bg-gray-900"}`} />
                                        <p className={`whitespace-pre-wrap break-words py-0.5 text-[13px] leading-snug text-gray-900 ${mine ? "text-right" : "text-left"} ${m.deletedAt ? "italic text-gray-400" : ""}`}>
                                            {m.deletedAt ? "Pesan dihapus" : m.text}
                                        </p>
                                    </div>

                                    {showTime && (
                                        <span className={`mt-1 text-[11px] tabular-nums text-gray-400 ${mine ? "pr-3" : "pl-3"}`}>
                                            {formatTime(date)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    <div ref={bottomRef} />
                </div>

                {/* input */}
                <form onSubmit={handleSend} className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2.5 mb-3">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Kirim.."
                        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                    />

                    {text.trim() ? (
                        <button type="submit" disabled={sending} aria-label="Send" className="cursor-pointer text-blue-500 disabled:opacity-50">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 2L11 13" />
                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                        </button>
                    ) : (
                        <div className="flex shrink-0 items-center gap-3 text-gray-900">
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