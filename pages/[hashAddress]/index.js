import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getDetailServer } from "@/services/server";
import { getPersonalPosts, toggleLikePost, checkLikePost, checkManyComments } from "@/services/post";
import { dataUser } from "@/services/user";
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
        stroke={active ? "#111827" : "#9ca3af"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
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
        stroke={active ? "#111827" : "#9ca3af"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
)

const Wallet = () => {
    const [address, setAddress] = useState("")
    const [user, setUser] = useState({})
    const [posts, setPosts] = useState([])
    const [likedPosts, setLikedPosts] = useState({})
    const [commentCounts, setCommentCounts] = useState({})
    const [serverDetails, setServerDetails] = useState({})
    const [activeTab, setActiveTab] = useState("posts")

    const router = useRouter()
    const { hashAddress } = router.query

    const truncateAddress = (address, start = 6, end = 12) => {
        if (!address) return "";
        if (address.length <= start + end) return address;
        return `${address.slice(0, start)}...${address.slice(-end)}`;
    }

    const fetchLikeStatuses = async (postList) => {
        const results = await Promise.all(
            postList.map(async (post) => {
                const res = await checkLikePost(post.id)
                return [post.id, res ? Boolean(res.data) : false]
            })
        )
        setLikedPosts(Object.fromEntries(results))
    }

    const fetchCommentCounts = async (postList) => {
        const results = await Promise.all(
            postList.map(async (post) => {
                try {
                    const res = await checkManyComments(post.id)
                    return [post.id, res ? Number(res.data) || 0 : 0]
                } catch (err) {
                    console.error(`Failed to fetch comments for post ${post.id}`, err)
                    return [post.id, 0]
                }
            })
        )
        setCommentCounts(Object.fromEntries(results))
    }

    const fetchPosts = async () => {
        const response = await getPersonalPosts(hashAddress)
        if (!response) {
            toast.error("Failed to fetch posts")
        } else {
            setPosts(response.data)
            fetchLikeStatuses(response.data)
            fetchCommentCounts(response.data)
        }
    }

    const handlerLike = async (postId) => {
        const response = await toggleLikePost(postId)
        if (!response) {
            toast.error("Failed to like post")
        } else {
            fetchPosts()
        }
    }

    const fetchDataUser = async () => {
        const response = await dataUser(hashAddress)
        if (!response) {
            toast.error("Failed to fetch user")
        } else {
            setUser(response.data)
        }
    }

    const checkToken = async () => {
        const token = Cookies.get("token")
        if (token) {
            const jwtToken = atob(token)
            const payload = jwtDecode(jwtToken)
            const hashFromPayload = payload.hash
            setAddress(hashFromPayload)
        }
    }

    useEffect(() => {
        if (hashAddress) {
            fetchPosts()
            fetchDataUser()
            checkToken()
        }
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

        const uniqueServerIds = [
            ...new Set(posts.map((p) => p.server).filter(Boolean))
        ]

        const idsToFetch = uniqueServerIds.filter((id) => !(id in serverDetails))
        if (idsToFetch.length === 0) return

        let isMounted = true

        const fetchAll = async () => {
            const results = await Promise.all(
                idsToFetch.map(async (id) => {
                    try {
                        const response = await getDetailServer(id)
                        return [id, response?.data ?? null]
                    } catch (err) {
                        console.error(`Failed to fetch server ${id}`, err)
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

    const isOwner = address == user?.hash
    const initial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : "?"

    const links = [
        { href: user?.link1, name: user?.nameLink1 },
        { href: user?.link2, name: user?.nameLink2 },
        { href: user?.link3, name: user?.nameLink3 },
    ].filter((item) => item.href && item.name)

    return (
        <div className="flex flex-col gap-2 md:flex-row pb-12">
            <div className="w-full md:w-2/3 border-0 md:border-r border-gray-200">
                <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-4 py-3">
                    {isOwner ? (
                        <Link href="/post/create" aria-label="Create post" className="text-gray-900">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                        </Link>
                    ) : (
                        <button onClick={() => router.back()} aria-label="Back" className="text-gray-900 cursor-pointer">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="px-4 md:px-6">
                    <div className="flex gap-4 items-start mt-2">
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="text-white text-2xl sm:text-3xl font-bold">{initial}</span>
                            </div>
                            {isOwner && (
                                <Link
                                    href="/edit-profile"
                                    aria-label="Edit profile photo"
                                    className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </Link>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-semibold text-gray-900 truncate">
                                {user?.displayName ? user.displayName.split(" ")[0] : "-"}
                            </h2>

                            <div className="mt-2 flex items-center gap-8 text-xs text-gray-700">
                                <p className="mt-1 inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 self-start max-w-full">
                                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l4-4a4 4 0 015.656 5.656l-1.5 1.5" />
                                    </svg>
                                    <span className="text-[11px] font-mono text-gray-600 truncate">
                                        {hashAddress ? truncateAddress(hashAddress) : "Not available"}
                                    </span>
                                </p>
                            </div>

                            <div className="mt-3 flex gap-2">
                                {isOwner ? (
                                    <Link
                                        href="/edit-profile"
                                        className="flex-1 text-xs font-medium py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 text-center transition-colors"
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
                                    <Link
                                        href=""
                                        className="flex-1 text-xs font-medium py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 text-center transition-colors cursor-pointer"
                                    >
                                        Chat
                                    </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-1">
                        {user?.bio ? (
                            <p className="text-xs text-gray-600">{user.bio}</p>
                        ) : (
                            isOwner && (
                                <Link href="/edit-profile" className="text-xs text-gray-400">
                                    Add bio
                                </Link>
                            )
                        )}

                        {links.length > 0 && (
                            <div className="flex flex-wrap gap-3">
                                {links.map((item) => (
                                    <Link key={item.href} href={item.href} className="text-xs text-blue-500 hover:text-blue-700">
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("posts")}
                        aria-label="Posts"
                        className={`flex-1 flex justify-center py-3 cursor-pointer border-b-2 ${activeTab === "posts" ? "border-gray-900" : "border-transparent"}`}
                    >
                        <GridIcon active={activeTab === "posts"} />
                    </button>
                    <button
                        onClick={() => setActiveTab("reposts")}
                        aria-label="Reposts"
                        className={`flex-1 flex justify-center py-3 cursor-pointer border-b-2 ${activeTab === "reposts" ? "border-gray-900" : "border-transparent"}`}
                    >
                        <RepostIcon active={activeTab === "reposts"} />
                    </button>
                </div>

                <div className="px-4 md:px-6">
                    {activeTab === "posts" && (!posts || posts.length === 0) && (
                        <div className="flex flex-col items-center text-center py-16">
                            <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="5" width="18" height="14" rx="3" />
                                    <circle cx="9" cy="11" r="2" />
                                    <path d="M21 16l-5-5-8 8" />
                                </svg>
                            </div>
                            <h3 className="mt-4 text-base font-semibold text-gray-900">
                                {isOwner ? "Upload your photos!" : "No posts yet"}
                            </h3>
                            <p className="mt-1 text-xs text-gray-600 max-w-[260px]">
                                {isOwner
                                    ? "Express yourself through photos and start connecting with students around the world."
                                    : "Shared posts will appear here."}
                            </p>
                        </div>
                    )}

                    {activeTab === "reposts" && (
                        <div className="flex flex-col items-center text-center py-16">
                            <h3 className="text-base font-semibold text-gray-900">No reposts yet</h3>
                            <p className="mt-1 text-xs text-gray-600 max-w-[260px]">
                                Reposted posts will appear here.
                            </p>
                        </div>
                    )}

                    {activeTab === "posts" && (
                        <div className="mt-4 flex flex-col gap-6">
                            {posts?.map((post) => {
                                const server = serverDetails[post.server]
                                const isLiked = Boolean(likedPosts[post.id])
                                const commentCount = commentCounts[post.id] ?? 0

                                return (
                                    <div key={post.id} className="border-b border-gray-200 pb-6">
                                        <Link href={`/${post.user}`} className="flex gap-2 items-center">
                                            <div className="bg-blue-300 rounded-4xl p-4"></div>

                                            <div className="text-xs">
                                                <h2 className="font-semibold">{truncateAddress(post.user)}</h2>
                                                <p className="flex gap-1 md:gap-2">
                                                    <span className="opacity-50">{post.createdAt ? formatTimestamp(post.createdAt) : "-"}</span>
                                                    <span className="bg-orange-500 text-white">{server?.serverName ? `server: ${server.serverName}` : ""}</span>
                                                </p>
                                                <p className="mt-1">{post.caption}</p>
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
                                                            <p className="text-[10px]">{post.likesCount}</p>
                                                        </button>
                                                        <Link href={`/post/${post.id}`} className="cursor-pointer">
                                                            <Image src="/icon/comment.png" alt="Comment" width={20} height={20} />
                                                            <p className="text-[10px]">{commentCount}</p>
                                                        </Link>
                                                        <Link href={`/post/${post.id}`} className="cursor-pointer">
                                                            <Image src="/icon/reward.png" alt="Reward This Post" width={25} height={25} />
                                                        </Link>
                                                    </div>

                                                    <button className="cursor-pointer">
                                                        <Image src="/icon/share.png" alt="Share" width={20} height={20} />
                                                    </button>
                                                </div>
                                                <div className="bg-red-200 w-full h-[280px] sm:h-[375px] md:h-[300px] lg:h-[375px] md:w-[300px] lg:w-[375px] order-1 md:order-2"></div>
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
                                                            <p className="text-[10px]">{post.likesCount}</p>
                                                        </button>
                                                        <Link href={`/post/${post.id}`} className="cursor-pointer flex items-center gap-1">
                                                            <Image src="/icon/comment.png" alt="Comment" width={15} height={15} />
                                                            <p className="text-[10px]">{commentCount}</p>
                                                        </Link>
                                                        <Link href={`/post/${post.id}`} className="cursor-pointer">
                                                            <Image src="/icon/reward.png" alt="Reward This Post" width={20} height={20} />
                                                        </Link>
                                                    </div>

                                                    <button className="cursor-pointer">
                                                        <Image src="/icon/share.png" alt="Share" width={15} height={15} />
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