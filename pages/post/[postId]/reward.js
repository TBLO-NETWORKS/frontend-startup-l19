import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { detailPost } from "@/services/post";
import { getDetailServer } from "@/services/server";
import ConnectWallet from "@/components/connectWallet";

const REWARDS = [
    { id: "thumbs", name: "Bubble", icon: "🫧", amount: 1, desc: "A small thank-you" },
    { id: "fire", name: "Blessed", icon: "🧿", amount: 5, desc: "Nice post" },
    { id: "star", name: "DNA", icon: "🧬", amount: 10, desc: "Quality content" },
    { id: "diamond", name: "Brain", icon: "🧠", amount: 25, desc: "Outstanding work" },
    { id: "crown", name: "GOAT", icon: "🐐", amount: 50, desc: "The very best" },
]

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

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const CheckIcon = () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
        <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
        />
    </svg>
)

const RewardCard = ({ reward, active, onSelect }) => (
    <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onSelect(active ? null : reward)}
        className={`group relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left cursor-pointer transition duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            active
                ? "border-blue-500 bg-gradient-to-b from-blue-50 to-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.45)] ring-1 ring-blue-500"
                : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md motion-reduce:hover:translate-y-0"
        }`}
    >
        {/* Selected check */}
        <span
            className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white transition duration-200 motion-reduce:transition-none ${
                active ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
            aria-hidden="true"
        >
            <CheckIcon />
        </span>

        {/* Icon tile */}
        <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-colors ${
                active ? "bg-blue-100" : "bg-gray-100 group-hover:bg-gray-200/70"
            }`}
        >
            {reward.icon}
        </span>

        <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900">{reward.name}</span>
            <span className="mt-0.5 block text-xs leading-snug text-gray-500">{reward.desc}</span>
        </span>

        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                active ? "bg-blue-500 text-white" : "bg-orange-50 text-orange-600"
            }`}
        >
            +{reward.amount} {reward.amount === 1 ? "pt" : "pts"}
        </span>
    </button>
)

const RewardSomePost = () => {
    const [post, setPost] = useState(null)
    const [server, setServer] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedReward, setSelectedReward] = useState(null)
    const [sending, setSending] = useState(false)

    const router = useRouter()
    const { postId } = router.query

    const fetchPostDetail = async () => {
        const response = await detailPost(postId)
        if (!response) {
            toast.error("Failed to fetch post")
        } else {
            setPost(response.data)
        }
        setLoading(false)
    }

    const handleSendReward = async () => {
        if (!selectedReward) return

        setSending(true)
        try {
            
            toast.success(`Reward "${selectedReward.name}" sent!`)
            setSelectedReward(null)
        } catch (err) {
            toast.error("Failed to send reward")
        } finally {
            setSending(false)
        }
    }

    useEffect(() => {
        if (!postId) return
        fetchPostDetail()
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

                            {post?.image && (
                                <div className="mt-2">
                                    <div className="bg-red-200 w-full h-[280px] sm:h-[375px] md:h-[300px] lg:h-[375px] md:w-[300px] lg:w-[375px]"></div>
                                </div>
                            )}
                        </div>

                        {/* Reward picker */}
                        <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                            <div className="p-5 sm:p-6">
                                <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                                    Send a reward
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Show your appreciation to{" "}
                                    <span className="font-medium text-gray-900">
                                        {truncateAddress(post.user, 6, 4)}
                                    </span>
                                </p>

                                <div
                                    role="radiogroup"
                                    aria-label="Choose a reward"
                                    className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
                                >
                                    {REWARDS.map((reward) => (
                                        <RewardCard
                                            key={reward.id}
                                            reward={reward}
                                            active={selectedReward?.id === reward.id}
                                            onSelect={setSelectedReward}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 border-t border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className="min-w-0" aria-live="polite">
                                    {selectedReward ? (
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl">
                                                {selectedReward.icon}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-gray-900">
                                                    {selectedReward.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {selectedReward.amount} {selectedReward.amount === 1 ? "point" : "points"} will be sent
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">
                                            Select a reward to continue
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSendReward}
                                    disabled={!selectedReward || sending}
                                    className="w-full rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-blue-600 active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:active:scale-100 motion-reduce:transition-none sm:w-auto"
                                >
                                    {sending
                                        ? "Sending..."
                                        : selectedReward
                                            ? `Send ${selectedReward.name}`
                                            : "Send reward"}
                                </button>
                            </div>
                        </section>
                    </>
                )}
            </div>

            <ConnectWallet />
        </div>
    )
}

export default RewardSomePost