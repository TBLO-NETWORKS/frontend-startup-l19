import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getDetailServer } from "@/services/server";
import { getPersonalPosts, toggleLikePost, checkLikePost, checkManyComments } from "@/services/post";
import { dataUser, setPublicKey } from "@/services/user";
import { openChat } from "@/services/chat";
import { ensureKeyPair } from "@/lib/chatCrypto";
import ConnectWallet from "@/components/connectWallet";

const HeartIcon = ({ filled, size = 20 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? "#ef4444" : "none"}
        stroke={filled ? "#ef4444" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
)

const GridIcon = ({ active }) => (
    <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}
    >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
    </svg>
)

const RepostIcon = ({ active }) => (
    <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}
    >
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
)

const PostSkeleton = () => (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-6 animate-pulse">
        <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="flex flex-col gap-2">
                <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-2.5 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
        </div>
        <div className="mt-3 h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="mt-3 h-[200px] w-full md:w-[300px] lg:w-[375px] rounded bg-gray-200 dark:bg-gray-700"></div>
    </div>
)

const ProfileSkeleton = () => (
    <div className="px-4 md:px-6 animate-pulse">
        <div className="flex gap-4 items-start mt-2">
            <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
            <div className="flex-1 min-w-0">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="mt-3 h-6 w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="mt-3 flex gap-2">
                    <div className="h-8 flex-1 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-8 flex-1 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                </div>
            </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
    </div>
)

// Jalankan fn untuk setiap item, maksimal `size` request bersamaan
// (supaya tidak menembak puluhan request sekaligus)
const mapInBatches = async (items, size, fn) => {
    const out = []
    for (let i = 0; i < items.length; i += size) {
        const chunk = items.slice(i, i + size)
        out.push(...(await Promise.all(chunk.map(fn))))
    }
    return out
}

// Singkat alamat/hash: 0x1234...abcd (sesuaikan formatnya kalau sebelumnya beda)
const truncateAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ""

const BATCH_SIZE = 5

const Wallet = () => {
    const router = useRouter()
    const { hashAddress } = router.query // dari nama file: pages/[hashAddress]/index.js

    const [address, setAddress] = useState("")
    const [user, setUser] = useState({})
    const [posts, setPosts] = useState([])
    const [loadingPosts, setLoadingPosts] = useState(true)
    const [loadingUser, setLoadingUser] = useState(true)
    const [likedPosts, setLikedPosts] = useState({})
    const [commentCounts, setCommentCounts] = useState({})
    const [serverDetails, setServerDetails] = useState({})
    const [activeTab, setActiveTab] = useState("posts")
    const [openingChat, setOpeningChat] = useState(false)

    const extrasRequested = useRef(new Set())
    const pendingLikes = useRef(new Set())
    const serversRequested = useRef(new Set())

    const fetchPostExtras = async (postList, isCancelled) => {
        const newPosts = postList.filter((p) => !extrasRequested.current.has(p.id))
        if (newPosts.length === 0) return
        newPosts.forEach((p) => extrasRequested.current.add(p.id))

        const results = await mapInBatches(newPosts, BATCH_SIZE, async (post) => {
            const [likeRes, commentRes] = await Promise.all([
                checkLikePost(post.id).catch(() => null),
                checkManyComments(post.id).catch(() => null),
            ])
            return {
                id: post.id,
                liked: likeRes ? Boolean(likeRes.data) : false,
                comments: commentRes ? Number(commentRes.data) || 0 : 0,
            }
        })

        if (isCancelled?.()) return

        setLikedPosts((prev) => {
            const next = { ...prev }
            results.forEach((r) => { next[r.id] = r.liked })
            return next
        })
        setCommentCounts((prev) => {
            const next = { ...prev }
            results.forEach((r) => { next[r.id] = r.comments })
            return next
        })
    }

    const fetchPosts = async (isCancelled) => {
        const response = await getPersonalPosts(hashAddress)
        if (isCancelled?.()) return
        setLoadingPosts(false)
        if (!response) {
            toast.error("Failed to fetch posts")
        } else {
            setPosts(response.data)
            fetchPostExtras(response.data, isCancelled)
        }
    }

    const fetchDataUser = async (isCancelled) => {
        const response = await dataUser(hashAddress)
        if (isCancelled?.()) return
        setLoadingUser(false)
        if (!response) {
            toast.error("Failed to fetch user")
        } else {
            setUser(response.data)
        }
    }

    const handlerLike = async (postId) => {
        if (pendingLikes.current.has(postId)) return
        pendingLikes.current.add(postId)

        const wasLiked = Boolean(likedPosts[postId])
        const delta = wasLiked ? -1 : 1

        const apply = (liked, d) => {
            setLikedPosts((prev) => ({ ...prev, [postId]: liked }))
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? { ...p, likesCount: Math.max(0, (Number(p.likesCount) || 0) + d) }
                        : p
                )
            )
        }

        apply(!wasLiked, delta)

        try {
            const response = await toggleLikePost(postId)
            if (!response) throw new Error("toggle failed")
        } catch (err) {
            apply(wasLiked, -delta) // rollback
            toast.error("Failed to like post")
        } finally {
            pendingLikes.current.delete(postId)
        }
    }

    const handleChat = async () => {
        if (openingChat || !address || !hashAddress) return
        setOpeningChat(true)

        try {
            // 1) siapkan kunci enkripsi di perangkat ini
            let keyResult
            try {
                const me = await dataUser(address)
                keyResult = await ensureKeyPair(
                    address,
                    me?.data?.publicKey || null,
                    async (publicKey) => {
                        const res = await setPublicKey(publicKey)
                        console.log("[chat] setPublicKey response:", res)
                        if (!res || res.error) throw new Error("upload public key gagal")
                    }
                )
            } catch (err) {
                console.error("[chat] gagal menyiapkan kunci:", err)
                toast.error("Gagal menyiapkan kunci enkripsi: " + (err?.message || "unknown"))
                return
            }

            if (keyResult.status !== "ready") {
                router.push(`/chat/${[address, hashAddress].sort().join("_")}`)
                return
            }

            // 2) buka chat
            const res = await openChat({ targetHash: hashAddress })
            console.log("[chat] openChat response:", res)

            if (!res || res.error) {
                toast.error(
                    res?.data?.message || res?.message || "Gagal membuka chat (server tidak merespons dengan benar)"
                )
                return
            }
            if (!res.data?.chatId) {
                toast.error("Gagal membuka chat: chatId tidak ditemukan di response")
                return
            }

            router.push(`/chat/${res.data.chatId}`)
        } catch (err) {
            console.error("[chat] error tak terduga:", err)
            toast.error("Gagal membuka chat: " + (err?.message || "unknown"))
        } finally {
            setOpeningChat(false)
        }
    }

    const readAddressFromToken = () => {
        try {
            const token = Cookies.get("token")
            if (!token) return
            const payload = jwtDecode(atob(token))
            setAddress(payload.hash)
        } catch (err) {
            console.error("Invalid token", err)
        }
    }

    useEffect(() => {
        readAddressFromToken()
    }, [])

    useEffect(() => {
        if (!hashAddress) return

        let cancelled = false
        const isCancelled = () => cancelled

        // reset semua state & cache saat pindah ke profil lain
        extrasRequested.current = new Set()
        serversRequested.current = new Set()
        setLoadingPosts(true)
        setLoadingUser(true)
        setPosts([])
        setLikedPosts({})
        setCommentCounts({})
        setServerDetails({})
        setUser({})

        fetchPosts(isCancelled)
        fetchDataUser(isCancelled)

        return () => { cancelled = true }
    }, [hashAddress])

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "-";

        let date;
        if (typeof timestamp === "string" || typeof timestamp === "number") {
            date = new Date(timestamp);
        } else if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            return "-";
        }

        return date.toLocaleString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    useEffect(() => {
        if (!posts || posts.length === 0) return

        const idsToFetch = [...new Set(posts.map((p) => p.server).filter(Boolean))]
            .filter((id) => !serversRequested.current.has(id))
        if (idsToFetch.length === 0) return

        idsToFetch.forEach((id) => serversRequested.current.add(id))

        let isMounted = true

        const fetchAll = async () => {
            const results = await Promise.all(
                idsToFetch.map(async (id) => {
                    try {
                        const response = await getDetailServer(id)
                        return [id, response?.data ?? null]
                    } catch (err) {
                        console.error(`Failed to fetch server ${id}`, err)
                        serversRequested.current.delete(id) // boleh dicoba lagi nanti
                        return [id, null]
                    }
                })
            )

            if (!isMounted) return
            setServerDetails((prev) => {
                const next = { ...prev }
                results.forEach(([id, data]) => {
                    next[id] = data
                })
                return next
            })
        }

        fetchAll()
        return () => { isMounted = false }
    }, [posts])

    // Tunggu router siap (hashAddress baru tersedia setelah ini).
    // Harus di bawah semua hooks supaya urutan hooks tetap konsisten.
    if (!router.isReady) return null

    const isOwner = address == user?.hash
    const initial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : "?"

    const links = [
        { href: user?.link1, name: user?.nameLink1 },
        { href: user?.link2, name: user?.nameLink2 },
        { href: user?.link3, name: user?.nameLink3 },
    ].filter((item) => item.href && item.name)

    return (
        <div className="flex flex-col gap-2 md:flex-row pb-12">
            <div className="w-full md:w-2/3 border-0 md:border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white transition-colors">
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex items-center justify-between px-4 py-3 transition-colors">
                    {isOwner ? (
                        <Link href="/post/create" aria-label="Create post" className="text-gray-900 dark:text-white">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                        </Link>
                    ) : (
                        <button onClick={() => router.back()} aria-label="Back" className="text-gray-900 dark:text-white cursor-pointer">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                    )}
                </div>

                {loadingUser ? (
                    <ProfileSkeleton />
                ) : (
                <div className="px-4 md:px-6">
                    <div className="flex gap-4 items-start mt-2">
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 dark:shadow-black/40">
                                <span className="text-white text-2xl sm:text-3xl font-bold">{initial}</span>
                            </div>
                            {isOwner && (
                                <Link
                                    href="/edit-profile"
                                    aria-label="Edit profile photo"
                                    className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </Link>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {user?.displayName ? user.displayName.split(" ")[0] : "-"}
                            </h2>

                            <div className="mt-2 flex items-center gap-8 text-xs text-gray-700 dark:text-gray-200">
                                <p className="mt-1 inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 dark:border dark:border-gray-600 rounded-full px-3 py-1 self-start max-w-full">
                                    <svg className="w-3 h-3 text-gray-400 dark:text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l4-4a4 4 0 015.656 5.656l-1.5 1.5" />
                                    </svg>
                                    <span className="text-[11px] font-mono text-gray-600 dark:text-gray-200 truncate">
                                        {hashAddress ? truncateAddress(hashAddress) : "Not available"}
                                    </span>
                                </p>
                            </div>

                            <div className="mt-3 flex gap-2">
                                {isOwner ? (
                                    <Link
                                        href="/edit-profile"
                                        className="flex-1 text-xs font-medium py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white text-center transition-colors"
                                    >
                                        Edit
                                    </Link>
                                ) : (
                                    <>
                                    <button
                                        className="flex-1 text-xs font-medium py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-center transition-colors cursor-pointer"
                                    >
                                        Follow
                                    </button>
                                    <button
                                        onClick={handleChat}
                                        disabled={openingChat || !address}
                                        className="flex-1 text-xs font-medium py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white text-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {openingChat ? "..." : "Chat"}
                                    </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-1">
                        {user?.bio ? (
                            <p className="text-xs text-gray-600 dark:text-gray-200">{user.bio}</p>
                        ) : (
                            isOwner && (
                                <Link href="/edit-profile" className="text-xs text-gray-400 dark:text-gray-300">
                                    Add bio
                                </Link>
                            )
                        )}

                        {links.length > 0 && (
                            <div className="flex flex-wrap gap-3">
                                {links.map((item) => (
                                    <Link key={item.href} href={item.href} className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                )}

                <div className="mt-4 flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab("posts")}
                        aria-label="Posts"
                        className={`flex-1 flex justify-center py-3 cursor-pointer border-b-2 ${activeTab === "posts" ? "border-gray-900 dark:border-white" : "border-transparent"}`}
                    >
                        <GridIcon active={activeTab === "posts"} />
                    </button>
                    <button
                        onClick={() => setActiveTab("reposts")}
                        aria-label="Reposts"
                        className={`flex-1 flex justify-center py-3 cursor-pointer border-b-2 ${activeTab === "reposts" ? "border-gray-900 dark:border-white" : "border-transparent"}`}
                    >
                        <RepostIcon active={activeTab === "reposts"} />
                    </button>
                </div>

                <div className="px-4 md:px-6">
                    {activeTab === "posts" && !loadingPosts && (!posts || posts.length === 0) && (
                        <div className="flex flex-col items-center text-center py-16">
                            <div className="w-24 h-24 rounded-3xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="5" width="18" height="14" rx="3" />
                                    <circle cx="9" cy="11" r="2" />
                                    <path d="M21 16l-5-5-8 8" />
                                </svg>
                            </div>
                            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                                {isOwner ? "Upload your photos!" : "No posts yet"}
                            </h3>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-[260px]">
                                {isOwner
                                    ? "Express yourself through photos and start connecting with students around the world."
                                    : "Shared posts will appear here."}
                            </p>
                        </div>
                    )}

                    {activeTab === "reposts" && (
                        <div className="flex flex-col items-center text-center py-16">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">No reposts yet</h3>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-[260px]">
                                Reposted posts will appear here.
                            </p>
                        </div>
                    )}

                    {activeTab === "posts" && (
                        <div className="mt-4 flex flex-col gap-6">
                            {loadingPosts ? (
                                <>
                                    <PostSkeleton />
                                    <PostSkeleton />
                                    <PostSkeleton />
                                </>
                            ) : posts?.map((post) => {
                                const server = serverDetails[post.server]
                                const isLiked = Boolean(likedPosts[post.id])
                                const commentCount = commentCounts[post.id] ?? 0

                                return (
                                    <div key={post.id} className="border-b border-gray-200 dark:border-gray-700 pb-6">
                                        <Link href={`/${post.user}`} className="flex gap-2 items-center">
                                            <div className="bg-blue-300 dark:bg-blue-400 rounded-4xl p-4"></div>

                                            <div className="text-xs">
                                                <h2 className="font-semibold dark:text-white">{truncateAddress(post.user)}</h2>
                                                <p className="flex gap-1 md:gap-2">
                                                    <span className="opacity-50 dark:opacity-100 dark:text-gray-400">{post.createdAt ? formatTimestamp(post.createdAt) : "-"}</span>
                                                    <span className="bg-orange-500 text-white">{server?.serverName ? `server: ${server.serverName}` : ""}</span>
                                                </p>
                                                <p className="mt-1 dark:text-gray-100">{post.caption}</p>
                                            </div>
                                        </Link>

                                        {post?.image ? (
                                            <div className="mt-2 flex flex-col md:flex-row">
                                                <div className="flex justify-between flex-row md:flex-col py-3 md:px-3 gap-6 order-2 md:order-1">
                                                    <div className="flex flex-row md:flex-col gap-6">
                                                        <button
                                                            className="cursor-pointer flex md:flex-col items-center gap-1"
                                                            onClick={() => handlerLike(post.id)}
                                                            aria-label={isLiked ? "Unlike" : "Like"}
                                                            aria-pressed={isLiked}
                                                        >
                                                            <HeartIcon filled={isLiked} size={20} />
                                                            <p className="text-[10px] dark:text-gray-200">{post.likesCount}</p>
                                                        </button>
                                                        <Link href={`/post/${post.id}`} className="cursor-pointer">
                                                            <Image src="/icon/comment.png" alt="Comment" width={20} height={20} className="dark:invert" />
                                                            <p className="text-[10px] dark:text-gray-200">{commentCount}</p>
                                                        </Link>
                                                        <Link href={`/post/${post.id}`} className="cursor-pointer">
                                                            <Image src="/icon/reward.png" alt="Reward This Post" width={25} height={25} />
                                                        </Link>
                                                    </div>

                                                    <button className="cursor-pointer">
                                                        <Image src="/icon/share.png" alt="Share" width={20} height={20} className="dark:invert" />
                                                    </button>
                                                </div>
                                                <div className="bg-red-200 dark:bg-gray-700 dark:border dark:border-gray-600 w-full h-[280px] sm:h-[375px] md:h-[300px] lg:h-[375px] md:w-[300px] lg:w-[375px] order-1 md:order-2"></div>
                                            </div>
                                        ) : (
                                            <div className="mt-2">
                                                <div className="flex justify-between py-1 md:px-2 gap-6">
                                                    <div className="flex gap-6">
                                                        <button
                                                            className="cursor-pointer flex items-center gap-1"
                                                            onClick={() => handlerLike(post.id)}
                                                            aria-label={isLiked ? "Unlike" : "Like"}
                                                            aria-pressed={isLiked}
                                                        >
                                                            <HeartIcon filled={isLiked} size={15} />
                                                            <p className="text-[10px] dark:text-gray-200">{post.likesCount}</p>
                                                        </button>
                                                        <Link href={`/post/${post.id}`} className="cursor-pointer flex items-center gap-1">
                                                            <Image src="/icon/comment.png" alt="Comment" width={15} height={15} className="dark:invert" />
                                                            <p className="text-[10px] dark:text-gray-200">{commentCount}</p>
                                                        </Link>
                                                        <Link href={`/post/${post.id}`} className="cursor-pointer">
                                                            <Image src="/icon/reward.png" alt="Reward This Post" width={20} height={20} />
                                                        </Link>
                                                    </div>

                                                    <button className="cursor-pointer">
                                                        <Image src="/icon/share.png" alt="Share" width={15} height={15} className="dark:invert" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default Wallet