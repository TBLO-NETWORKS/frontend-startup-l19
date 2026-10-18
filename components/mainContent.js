import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { getAllPosts, toggleLikePost, checkLikePost, checkManyComments } from "@/services/post"

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

const PlusIcon = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
)

const PostSkeleton = () => (
  <div className="border-b border-gray-200 dark:border-gray-700 pb-6 animate-pulse">
    <div className="flex gap-3 items-center">
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-2.5 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </div>
    <div className="mt-3 h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
    <div className="mt-3 h-[200px] md:max-w-[375px] rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
  </div>
)

const MainContent = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState({})
  const [commentCounts, setCommentCounts] = useState({})

  const truncateAddress = (address, start = 6, end = 12) => {
    if (!address) return ""
    if (address.length <= start + end) return address
    return `${address.slice(0, start)}...${address.slice(-end)}`
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
    const response = await getAllPosts()
    setLoading(false)
    if (!response) {
      toast.error("Failed to fetch posts")
    } else {
      setPosts(response.data)
      fetchLikeStatuses(response.data)
      fetchCommentCounts(response.data)
    }
  }

  const applyLike = (postId, liked, delta) => {
    setLikedPosts((prev) => ({ ...prev, [postId]: liked }))
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, likesCount: (post.likesCount || 0) + delta } : post))
    )
  }

  const handlerLike = async (postId) => {
    const wasLiked = Boolean(likedPosts[postId])
    const delta = wasLiked ? -1 : 1
    applyLike(postId, !wasLiked, delta)

    const response = await toggleLikePost(postId)
    if (!response) {
      applyLike(postId, wasLiked, -delta)
      toast.error("Failed to like post")
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-"

    let date
    if (typeof timestamp === "string" || typeof timestamp === "number") {
      date = new Date(timestamp)
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000)
    } else {
      return "-"
    }

    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getName = (post) => (post.displayName ? post.displayName : truncateAddress(post.user))

  return (
    <div className="w-full md:w-2/3 border-0 md:border-r dark:border-gray-700 px-2 text-gray-900 dark:text-white transition-colors">
      <div className="flex items-center justify-between px-1 py-3">
        <Link
          href="/post/create"
          aria-label="Create post"
          className="w-6 h-6 rounded-md border-2 border-gray-900 dark:border-white flex items-center justify-center text-gray-900 dark:text-white"
        >
          <PlusIcon size={12} />
        </Link>

        <h2 className="bg-orange-500 text-white px-1 font-bold">TBLONETWORKS</h2>

        <div className="flex items-center gap-4 text-gray-900 dark:text-white">
          <Link href="/notifications" aria-label="Notifications">
            <HeartIcon filled={false} size={22} />
          </Link>
        </div>
      </div>

      <div className="mt-2 md:mt-4">
        <Link
          href="/post/create"
          className="flex flex-col gap-3 py-3 px-3 md:px-4 bg-gray-100 dark:bg-gray-800 dark:border dark:border-gray-600 dark:shadow-md dark:shadow-black/40 text-sm rounded-xl transition-colors"
        >
          <div className="flex justify-between items-center w-full">
            <div className="opacity-50 dark:opacity-80 flex gap-2 items-center">
              <Image src="/icon/write.png" alt="Create Post" width={20} height={20} className="dark:invert" />
              <p>Say something...</p>
            </div>

            <p className="bg-[#4272FC] text-white text-xs font-medium py-1.5 px-5 rounded-2xl">Post!</p>
          </div>

          <div className="flex justify-between w-full">
            <div className="flex gap-3 items-center">
              <Image src="/icon/image.png" alt="Create Post" width={20} height={20} className="dark:invert" />
              <Image src="/icon/camera.png" alt="Create Post" width={20} height={20} className="dark:invert" />
            </div>
          </div>
        </Link>

        <div className="mt-5 flex flex-col gap-6">
          {loading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            posts?.map((post) => {
              const isLiked = Boolean(likedPosts[post.id])
              const commentCount = commentCounts[post.id] ?? 0

              return (
                <div key={post.id} className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/${post.user}`} className="flex gap-3 items-center">
                      <div className="p-4 bg-blue-300 dark:bg-blue-400 rounded-full"></div>

                      <div className="text-xs">
                        <h2 className="font-semibold text-xs truncate dark:text-white">{getName(post)}</h2>
                        <p className="opacity-50 dark:opacity-100 dark:text-gray-400 text-[11px]">
                          {post.createdAt ? formatTimestamp(post.createdAt) : "-"}
                        </p>
                        <p className="mt-1 text-sm dark:text-gray-100">{post.caption}</p>
                      </div>
                    </Link>

                    <button className="cursor-pointer text-gray-500 dark:text-gray-300 shrink-0" aria-label="More options">
                      <DotsIcon />
                    </button>
                  </div>

                  {post.image ? (
                    <div className="mt-3 flex flex-row gap-3">
                      <div className="flex flex-col justify-between py-1 shrink-0">
                        <div className="flex flex-col items-center gap-5">
                          <button
                            className="cursor-pointer flex flex-col items-center gap-1"
                            onClick={() => handlerLike(post.id)}
                            aria-label={isLiked ? "Unlike" : "Like"}
                            aria-pressed={isLiked}
                          >
                            <HeartIcon filled={isLiked} size={20} />
                            <p className="text-[10px] dark:text-gray-200">{post.likesCount}</p>
                          </button>
                          <Link href={`/post/${post.id}`} className="cursor-pointer flex flex-col items-center gap-1">
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
                      <div className="bg-red-200 dark:bg-gray-700 dark:border dark:border-gray-600 rounded-2xl flex-1 h-[280px] sm:h-[375px] md:h-[300px] lg:h-[375px] md:max-w-[375px]"></div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="flex justify-between py-1 gap-6">
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
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default MainContent