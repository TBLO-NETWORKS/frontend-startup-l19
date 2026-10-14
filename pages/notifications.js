"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useAccount } from "wagmi"

import ConnectWallet from "@/components/connectWallet"

const MOCK_NOTIFICATIONS = [
    {
        id: "1",
        type: "like",
        user: { username: "fauzanchenko", avatar: null },
        postId: "101",
        postImage: null,
        createdAt: new Date().toISOString(),
        read: false,
    },
    {
        id: "2",
        type: "comment",
        user: { username: "sarahg", avatar: null },
        postId: "102",
        postImage: null,
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        read: false,
    },
    {
        id: "3",
        type: "follow",
        user: { username: "rapla", avatar: null },
        postId: null,
        postImage: null,
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        read: true,
    },
]

async function getNotifications(address) {
    return MOCK_NOTIFICATIONS
}

async function readNotifications(ids) {}

const NOTIFICATION_TEXT = {
    like: "liked your post",
    comment: "commented on your post",
    follow: "started following you",
}

function timeAgo(dateString) {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (seconds < 60) return "Now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getHref(n) {
    return n.type === "follow" || !n.postId ? `/${n.user.username}` : `/post/${n.postId}`
}

const Avatar = ({ user }) => {
    if (user.avatar) {
        return (
            <Image
                src={user.avatar}
                alt={user.username}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
        )
    }
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-300 dark:bg-blue-400 text-sm font-semibold uppercase text-white">
            {user.username.charAt(0)}
        </div>
    )
}

const NotificationSkeleton = () => (
    <div className="flex animate-pulse items-center gap-3 px-2 py-1">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
    </div>
)

const FeatureNotice = () => (
    <div
        role="status"
        className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200"
    >
        <span className="mt-0.5 font-bold">!</span>
        <p>
            The notifications feature is not live yet. The items below are sample data and are not
            connected to the server.
        </p>
    </div>
)

const Notifications = () => {
    const { address, isConnected } = useAccount()

    const [mounted, setMounted] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [status, setStatus] = useState("loading")

    useEffect(() => {
        setMounted(true)
    }, [])

    const load = useCallback(async () => {
        setStatus("loading")
        try {
            const data = await getNotifications(address)
            setNotifications(data)
            setStatus("success")
        } catch (error) {
            console.error(error)
            setStatus("error")
        }
    }, [address])

    useEffect(() => {
        if (mounted && isConnected) load()
    }, [mounted, isConnected, load])

    const unreadCount = notifications.filter((n) => !n.read).length

    const handleRead = (id) => {
        const target = notifications.find((n) => n.id === id)
        if (!target || target.read) return
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        readNotifications([id]).catch(console.error)
    }

    const handleReadAll = () => {
        const ids = notifications.filter((n) => !n.read).map((n) => n.id)
        if (ids.length === 0) return
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        readNotifications(ids).catch(console.error)
    }

    const renderContent = () => {
        if (!mounted) return null

        if (!isConnected) {
            return (
                <p className="mt-10 text-center text-sm text-gray-400 dark:text-gray-300">
                    Connect your wallet to see your notifications.
                </p>
            )
        }

        if (status === "loading") {
            return (
                <div className="mt-4 flex flex-col gap-3">
                    <NotificationSkeleton />
                    <NotificationSkeleton />
                    <NotificationSkeleton />
                </div>
            )
        }

        if (status === "error") {
            return (
                <div className="mt-10 text-center text-sm">
                    <p className="text-gray-500 dark:text-gray-300">Failed to load notifications.</p>
                    <button
                        onClick={load}
                        className="mt-3 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-600"
                    >
                        Try again
                    </button>
                </div>
            )
        }

        if (notifications.length === 0) {
            return (
                <p className="mt-10 text-center text-sm text-gray-400 dark:text-gray-300">
                    No notifications yet.
                </p>
            )
        }

        return (
            <ul className="mt-4 flex flex-col gap-1">
                {notifications.map((n) => (
                    <li key={n.id}>
                        <Link
                            href={getHref(n)}
                            onClick={() => handleRead(n.id)}
                            className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                n.read ? "" : "bg-sky-50 dark:bg-sky-500/15"
                            }`}
                        >
                            <Avatar user={n.user} />

                            <div className="flex w-full items-center justify-between gap-2 text-xs">
                                <div>
                                    <h2 className="dark:text-gray-100">
                                        <span className="font-semibold dark:text-white">{n.user.username}</span>{" "}
                                        {NOTIFICATION_TEXT[n.type] ?? "interacted with you"}
                                    </h2>
                                    <p className="opacity-50 dark:opacity-100 dark:text-gray-400">{timeAgo(n.createdAt)}</p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    {!n.read && (
                                        <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" aria-label="Unread" />
                                    )}
                                    {n.postImage && (
                                        <Image
                                            src={n.postImage}
                                            alt="Post"
                                            width={38}
                                            height={38}
                                            className="h-[38px] w-[38px] rounded-md object-cover"
                                        />
                                    )}
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        )
    }

    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="w-full border-0 px-2 md:w-2/3 md:border-r dark:border-gray-700 text-gray-900 dark:text-white transition-colors">
                <div className="mt-4 md:mt-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Image src="/icon/notifications.png" alt="Notifications" width={20} height={20} className="dark:invert" />
                            <h1 className="text-lg font-semibold dark:text-white">Notifications</h1>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/25 dark:text-amber-200">
                                Not live yet
                            </span>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleReadAll}
                                className="text-xs font-semibold text-sky-500 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <hr className="mt-4 border-gray-300 dark:border-gray-700" />

                    <FeatureNotice />

                    {renderContent()}
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default Notifications