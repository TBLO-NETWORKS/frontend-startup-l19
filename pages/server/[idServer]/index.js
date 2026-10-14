import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import Link from "next/link";

import { dataUser } from "@/services/user";
import { getServerPosts, toggleLikePost, checkLikePost, checkManyComments } from "@/services/post";
import { getDetailServer, joinServer, leaveServer } from "@/services/server"
import ConnectWallet from "@/components/connectWallet"

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

const DetailServer = () => {
    const [server, setServer] = useState({})
    const [serverPosts, setServerPosts] = useState([])
    const [likedPosts, setLikedPosts] = useState({})
    const [commentCounts, setCommentCounts] = useState({})
    const [user, setUser] = useState("")
    const [loading, setLoading] = useState(false)

    const [owner, setOwner] = useState(false)
    const [join, setJoin] = useState(false)

    const router = useRouter()
    const { idServer } = router.query

    const truncateAddress = (address, start = 6, end = 12) => {
        if (!address) return "";
        if (address.length <= start + end) return address;
        return `${address.slice(0, start)}...${address.slice(-end)}`;
    }

    const fetchDetailServer = async() => {
        const response = await getDetailServer(idServer)

        if(!response) {
            toast.error("Failed to fetch servers!")
        } else {
            setServer(response.data)
        }
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

    const fetchServerPosts = async() => {
        const response = await getServerPosts(idServer)

        if(!response) {
            toast.error("Failed to fetch servers!")
        } else {
            setServerPosts(response.data)
            fetchLikeStatuses(response.data)
            fetchCommentCounts(response.data)
        }
    }

    const handlerLike = async (postId) => {
        const response = await toggleLikePost(postId)
        if (!response) {
            toast.error("Failed to like post")
        } else {
            fetchServerPosts()
        }
    }

    const checkOwner = async() => {
        const token = await Cookies.get("token")
        if(token) {
            const jwtToken = atob(token)
            const payload = jwtDecode(jwtToken)
            const hashFromPayload = payload.hash
            setUser(hashFromPayload)

            if(hashFromPayload === server.owner) {
                setOwner(true)
            }
        }
    }

    const checkJoin = async() => {
        try {
            const getDataUser = await dataUser(user)
            const moreDataUser = getDataUser.data

            const joinedServers = Array.isArray(moreDataUser?.servers) ? moreDataUser.servers : []
            const isJoined = joinedServers.includes(idServer)
            const isOwner = server.owner === user

            setJoin(isJoined || isOwner)
        } catch (error) {
            toast.error("Failed to check join status:", error)
        }
    }

    useEffect(() => {
        if(idServer) {
            fetchDetailServer()
            fetchServerPosts()
        }
    }, [idServer])

    useEffect(() => {
        if(server && server.owner) {
            checkOwner()
        }
    }, [server])

    useEffect(() => {
        if (user) {
            checkJoin()
        }
    }, [user])
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

        return date.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const handleJoinServer = async () => {
        if (loading) return
        setLoading(true)

        try {
            const ask = confirm("want to join this server?")
            if (!ask) return

            const response = await joinServer(idServer)
            if (!response) {
                toast.error("Failed to join server!")
                return
            }
            toast.success("Successfully joined the server!")

            await fetchDetailServer()
            await checkJoin()
        } catch (error) {
            toast.error("Failed to join server!")
        } finally {
            setLoading(false)
        }
    }

    const handleLeaveServer = async () => {
        if (loading) return
        setLoading(true)

        try {
            const ask = confirm("want to leave this server?")
            if (!ask) return

            const response = await leaveServer(idServer)
            if (!response) {
                toast.error("Failed to leave server!")
                return
            }
            toast.success("Successfully left the server!")

            await fetchDetailServer()
            await checkJoin()
        } catch (error) {
            toast.error("Failed to leave server!")
        } finally {
            setLoading(false)
        }
    }
    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="w-full md:w-2/3 border-0 md:border-r dark:border-gray-700 px-2 text-gray-900 dark:text-white transition-colors">
                <div className="mt-4">
                    <p className="text-sm opacity-50 dark:opacity-100 dark:text-gray-400">category : {server.category}</p>
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-semibold mt-5 dark:text-white">{server.serverName}</h1>
                        <p className="text-sm mt-4 opacity-50 dark:opacity-100 dark:text-gray-400"><span className="font-semibold opacity-100 dark:text-white">{server.members}</span> members</p>
                    </div>
                    <p className="text-sm opacity-50 dark:opacity-100 dark:text-gray-300 mt-1">{server.desc}</p>
                    <hr className="mt-4 opacity-50 dark:opacity-100 border border-gray-400 dark:border-gray-700" />
                    <div className="mt-2 flex justify-between">
                        {owner ? (
                            <button className="bg-green-500 hover:bg-green-600 cursor-pointer transition-all duration-300 text-white px-4 py-2 rounded-2xl text-sm">
                                You're the Owner
                            </button>
                        ) : join ? (
                            <button
                                disabled={loading}
                                onClick={handleLeaveServer}
                                className="bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 cursor-pointer text-white px-4 py-2 rounded-2xl text-sm transition-colors"
                            >
                                Joined
                            </button>
                        ) : (
                            <button
                                disabled={loading}
                                onClick={handleJoinServer}
                                className="bg-blue-500 hover:bg-blue-600 transition-all duration-300 cursor-pointer text-white px-4 py-2 rounded-2xl text-sm"
                            >
                                Join
                            </button>
                        )}

                        {join ? (
                            <Link href={`/server/${idServer}/create`} className="border cursor-pointer flex items-center justify-between gap-1 border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/15 px-4 py-2 rounded-2xl text-sm transition-colors">
                                <Image className="text-blue-500" src="/icon/add_blue.png" alt="Add" width={20} height={15} />
                                Create Post
                            </Link>
                        ) :
                        (
                            <div></div>
                        )
                        }
                    </div>

                    <div className="mt-8 flex flex-col gap-6">
                        {serverPosts?.map((post) => {
                            const isLiked = Boolean(likedPosts[post.id])
                            const commentCount = commentCounts[post.id] ?? 0

                            return (
                                <div key={post.id} className="border-b border-gray-300 dark:border-gray-700 pb-6">
                                    <Link href={`/${post.user}`} className="flex gap-2 items-center">
                                        <div className="bg-blue-300 dark:bg-blue-400 rounded-4xl p-4"></div>

                                        <div className="text-xs">
                                            <h2 className="font-semibold dark:text-white">{truncateAddress(post.user)}</h2>
                                            <p className="opacity-50 dark:opacity-100 dark:text-gray-400">{post.createdAt ? formatTimestamp(post.createdAt) : "-"}</p>
                                            <p className="mt-1 dark:text-gray-100">{post.caption}</p>
                                        </div>
                                    </Link>

                                    {post.image ? (
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
                                                    <Link href={`/post/${post.id}`} className="cursor-pointer flex md:flex-col items-center gap-1">
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
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default DetailServer