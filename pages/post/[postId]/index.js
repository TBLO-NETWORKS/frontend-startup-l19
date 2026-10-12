import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getDetailServer } from "@/services/server";
import { detailPost, commentPost, toggleLikePost, checkLikePost, deletePost, deleteComment } from "@/services/post";
import ConnectWallet from "@/components/connectWallet";
import { jwtDecode } from "jwt-decode";

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

const truncateAddress = (address, start = 6, end = 12) => {
    if (!address) return "";
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}

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

const DetailPost = () => {
    const [post, setPost] = useState(null)
    const [server, setServer] = useState(null)
    const [isLiked, setIsLiked] = useState(false)
    const [loading, setLoading] = useState(true)
    const [commentText, setCommentText] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [userHash, setUserHash] = useState(null)

    const router = useRouter()
    const { postId } = router.query

    const comments = post?.comments ?? []
    const isOwner = Boolean(userHash) && post?.user === userHash

    const fetchPost = async () => {
        const response = await detailPost(postId)
        if (!response) {
            toast.error("Failed to fetch post")
        } else {
            setPost(response.data)
        }
        setLoading(false)
    }

    const fetchLikeStatus = async () => {
        const res = await checkLikePost(postId)
        setIsLiked(res ? Boolean(res.data) : false)
    }

    const handlerLike = async () => {
        const response = await toggleLikePost(postId)
        if (!response) {
            toast.error("Failed to like post")
        } else {
            fetchPost()
            fetchLikeStatus()
        }
    }

    const handlerComment = async (e) => {
        const data = { text: commentText }

        e.preventDefault()
        setSubmitting(true)
        const response = await commentPost(postId, data)
        if (!response) {
            toast.error("Failed to send comment")
        } else {
            setCommentText("")
            fetchPost()
        }
        setSubmitting(false)
    }

    const handleDeletePost = async() => {
        const confirmDelete = window.confirm("Are you sure you want to delete this post?")
        if(confirmDelete) {
            const response = await deletePost(postId)
            if (!response) {
                toast.error("Failed to delete post")
            } else {
                toast.success("Post deleted successfully")
                router.back()
            }
        }
    }

    const handleDeleteComment = async(commentId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this comment?")
        if(confirmDelete) {
            const response = await deleteComment(commentId)
            if (!response) {
                toast.error("Failed to delete comment")
            } else {
                toast.success("Comment deleted successfully")
                fetchPost()
            }
        }
    }

    useEffect(() => {
        const token = Cookies.get("token")
        if (!token) return
        try {
            const payload = jwtDecode(atob(token))
            setUserHash(payload.hash ?? null)
        } catch (err) {
            setUserHash(null)
        }
    }, [])

    useEffect(() => {
        if (!postId) return
        fetchPost()
        fetchLikeStatus()
    }, [postId])

    useEffect(() => {
        if (!post?.server) return

        let isMounted = true
        const fetchServer = async () => {
            try {
                const response = await getDetailServer(post.server)
                if (isMounted) setServer(response?.data ?? null)
            } catch (err) {
                console.error(`Failed to fetch server ${post.server}`, err)
            }
        }

        fetchServer()
        return () => { isMounted = false }
    }, [post?.server])

    return (
        <div className="flex flex-col gap-2 md:flex-row pb-12">
            <div className="w-full md:w-2/3 border-0 md:border-r border-gray-200 px-4 md:px-6">
                {loading ? (
                    <p className="mt-8 text-sm text-gray-500">Loading...</p>
                ) : !post ? (
                    <div className="mt-8">
                        <p className="text-sm text-gray-500">Post not found.</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-3 text-xs font-medium text-blue-500 hover:text-blue-700"
                        >
                            Go back
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => router.back()}
                            className="mt-6 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                            Back
                        </button>

                        <div className="mt-4 border-b border-gray-300 pb-6">
                            <Link href={`/${post.user}`} className="flex gap-2 items-center">
                                <div className="bg-blue-300 rounded-4xl p-4"></div>

                                <div className="text-xs">
                                    <h2 className="font-semibold">{truncateAddress(post.user)}</h2>
                                    <p className="flex gap-2">
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
                                                onClick={handlerLike}
                                                aria-label={isLiked ? "Unlike" : "Like"}
                                                aria-pressed={isLiked}
                                            >
                                                <HeartIcon filled={isLiked} size={20} />
                                                <p className="text-[10px]">{post.likesCount ?? 0}</p>
                                            </button>
                                            <div className="flex md:flex-col items-center gap-1">
                                                <Image src="/icon/comment.png" alt="Comments" width={20} height={20} />
                                                <p className="text-[10px]">{comments.length}</p>
                                            </div>
                                            <Link href={`/post/${post.id}/reward`} className="cursor-pointer">
                                                <Image src="/icon/reward.png" alt="Reward This Post" width={25} height={25} />
                                            </Link>
                                        </div>

                                        <div className="flex flex-row md:flex-col items-center gap-6">
                                            <button className="cursor-pointer">
                                                <Image src="/icon/share.png" alt="Share" width={20} height={20} />
                                            </button>
                                            {isOwner && (
                                                <button
                                                    type="button"
                                                    className="cursor-pointer text-[10px] font-medium text-red-500 hover:text-red-700"
                                                    onClick={handleDeletePost}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-red-200 w-full h-[280px] sm:h-[375px] md:h-[300px] lg:h-[375px] md:w-[300px] lg:w-[375px] order-1 md:order-2"></div>
                                </div>
                            ) : (
                                <div className="mt-2">
                                    <div className="flex justify-between py-1 md:px-2 gap-6">
                                        <div className="flex gap-6">
                                            <button
                                                className="cursor-pointer flex items-center gap-1"
                                                onClick={handlerLike}
                                                aria-label={isLiked ? "Unlike" : "Like"}
                                                aria-pressed={isLiked}
                                            >
                                                <HeartIcon filled={isLiked} size={15} />
                                                <p className="text-[10px]">{post.likesCount ?? 0}</p>
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <Image src="/icon/comment.png" alt="Comments" width={15} height={15} />
                                                <p className="text-[10px]">{comments.length}</p>
                                            </div>
                                            <Link href={`/post/${post.id}/reward`} className="cursor-pointer">
                                                <Image src="/icon/reward.png" alt="Reward This Post" width={20} height={20} />
                                            </Link>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <button className="cursor-pointer">
                                                <Image src="/icon/share.png" alt="Share" width={15} height={15} />
                                            </button>
                                            {isOwner && (
                                                <button
                                                    onClick={handleDeletePost}
                                                    type="button"
                                                    className="cursor-pointer text-[10px] font-medium text-red-500 hover:text-red-700"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handlerComment} className="mt-4 flex flex-col gap-2">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment"
                                rows={3}
                                maxLength={500}
                                className="w-full text-sm rounded-lg border border-gray-300 p-3 resize-none focus:outline-none focus:border-blue-500"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">{commentText.length}/500</span>
                                <button
                                    type="submit"
                                    disabled={submitting || !commentText.trim()}
                                    className="text-xs font-medium py-2 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Sending..." : "Comment"}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 flex flex-col gap-4">
                            {comments.length === 0 ? (
                                <p className="text-xs text-gray-500">No comments yet. Be the first to comment.</p>
                            ) : (
                                comments.map((c, i) => (
                                    <div key={c.id ?? i} className="flex gap-2 border-b border-gray-200 pb-4">
                                        <Link href={`/${c.user}`} className="shrink-0">
                                            <div className="bg-blue-300 rounded-4xl p-4"></div>
                                        </Link>
                                        <div className="text-xs min-w-0">
                                            <p className="flex gap-2">
                                                <Link href={`/${c.user}`} className="font-semibold">
                                                    {truncateAddress(c.user)}
                                                </Link>
                                                <span className="opacity-50">{formatTimestamp(c.createdAt)}</span>
                                                {Boolean(userHash) && c.user === userHash && (
                                                    <button
                                                        onClick={() => handleDeleteComment(c.id)}
                                                        type="button"
                                                        className="cursor-pointer text-[10px] font-medium text-red-500 hover:text-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </p>
                                            <p className="mt-1 whitespace-pre-line break-words">{c.text}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            <ConnectWallet />
        </div>
    )
}

export default DetailPost