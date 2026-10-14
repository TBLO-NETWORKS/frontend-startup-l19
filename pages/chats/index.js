"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import Cookies from "js-cookie"
import { jwtDecode } from "jwt-decode"
import ConnectWallet from "@/components/connectWallet"
import { listChats } from "@/services/chat"
import { dataUser } from "@/services/user"

const ListChats = () => {
    const [chats, setChats] = useState([])
    const [keyword, setKeyword] = useState("")
    const [filter, setFilter] = useState("all")
    const [myHash, setMyHash] = useState("")
    const [profiles, setProfiles] = useState({})

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

    useEffect(() => {
        listChats().then((res) => setChats(res?.data?.data || res?.data || []))
    }, [])

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
                        {shown.length === 0 && (
                            <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-300">Belum ada chat</p>
                        )}

                        {shown.map((c) => {
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
                                                {c.lastMessage?.text || "Mulai percakapan"}
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