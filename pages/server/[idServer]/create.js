import { useState, useEffect } from "react"
import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

import { createPostServer } from "@/services/server";
import ConnectWallet from "@/components/connectWallet"

const HeartIcon = ({ size = 15 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
)

const DotsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="12" cy="19" r="1.6" />
    </svg>
)

const CreateServerPost = () => {
    const [account, setAccount] = useState("")
    const [caption, setCaption] = useState("");

    const router = useRouter()
    const { idServer } = router.query

    const handleCreatePost = async() => {
        const data = { caption }
        if(!data.caption) {
            toast.error("Caption is required")
        } else {
            const konfir = confirm("u want to post?")
            if(konfir) {
                const response = await createPostServer(idServer, data)
                if(response.error) {
                    toast.error(response.message)
                } else {
                    toast.success("Post created successfully")
                    setCaption("")
                    router.push(`/server/${idServer}`)
                }
            }
        }
    }

    const checkToken = async() => {
        const token = await Cookies.get("token")
        if(token) {
            const jwtToken = atob(token)
            const payload = jwtDecode(jwtToken)
            const hashFromPayload = payload
            
            setAccount(hashFromPayload)
        }
    }

    const truncateAddress = (address, start = 6, end = 12) => {
        if (!address) return "";
        if (address.length <= start + end) return address;
        return `${address.slice(0, start)}...${address.slice(-end)}`;
    }

    useEffect(() => {
      checkToken()
    }, [])
    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="w-full md:w-2/3 border-0 md:border-r dark:border-gray-700 px-2 text-gray-900 dark:text-white transition-colors">
                <div className="flex items-center justify-between px-1 py-3">
                    <button onClick={() => router.back()} aria-label="Back" className="text-gray-900 dark:text-white cursor-pointer">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white">Create Post in Server</h1>
                    <span className="w-[22px]"></span>
                </div>

                <div className="mt-1">
                    <p className="text-xs opacity-50 dark:opacity-100 dark:text-gray-400 px-1">say it all — your data stays secure</p>

                    <div className="mt-3 flex flex-col gap-3 py-3 px-3 md:px-4 bg-gray-100 dark:bg-gray-800 dark:border dark:border-gray-600 dark:shadow-md dark:shadow-black/40 rounded-xl transition-colors">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-2 items-start flex-1">
                                <span className="mt-1 opacity-50 dark:opacity-80 shrink-0">
                                    <Image src="/icon/write.png" alt="Write" width={20} height={20} className="dark:invert" />
                                </span>
                                <textarea
                                    rows={3}
                                    placeholder="What's on your mind?"
                                    className="bg-transparent w-full resize-none text-sm placeholder:text-sm dark:text-white dark:placeholder:text-gray-400 focus:outline-none py-1"
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                />
                            </div>

                            <span className="text-gray-500 dark:text-gray-300 shrink-0 mt-1">
                                <DotsIcon />
                            </span>
                        </div>

                        <div className="flex justify-between items-center w-full">
                            <div className="flex gap-3 items-center opacity-40 dark:opacity-60 cursor-not-allowed" title="Image upload is not available yet">
                                <Image src="/icon/image.png" alt="Image" width={20} height={20} className="dark:invert" />
                                <Image src="/icon/camera.png" alt="Camera" width={20} height={20} className="dark:invert" />
                            </div>

                            <button
                                onClick={handleCreatePost}
                                className="bg-[#4272FC] hover:bg-blue-500 text-white text-xs font-medium py-1.5 px-5 rounded-2xl cursor-pointer transition-colors"
                            >
                                Post!
                            </button>
                        </div>
                    </div>
                </div>

                <hr className="mt-6 text-gray-200 dark:text-gray-700" />

                <div className="mt-6 flex flex-col gap-6 opacity-75 dark:opacity-100">
                    <p className="text-xs opacity-50 dark:opacity-100 dark:text-gray-400 px-1">Preview</p>

                    <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                        <div className="flex items-start justify-between gap-2">
                            <Link href="/fauzanchenko" className="flex gap-3 items-start min-w-0">
                                <div className="w-10 h-10 shrink-0 bg-blue-300 dark:bg-blue-400 rounded-full"></div>

                                <div className="text-xs min-w-0">
                                    <h2 className="font-semibold text-xs truncate dark:text-white">{account.displayName ? account.displayName : truncateAddress(account.hash)}</h2>
                                    <p className="opacity-50 dark:opacity-100 dark:text-gray-400 text-[11px]">Now</p>
                                    <p className="mt-1 text-sm break-words dark:text-gray-100">{caption}</p>
                                </div>
                            </Link>

                            <span className="text-gray-500 dark:text-gray-300 shrink-0">
                                <DotsIcon />
                            </span>
                        </div>

                        <div className="mt-2 flex justify-between py-1 gap-6">
                            <div className="flex gap-6">
                                <span className="flex items-center gap-1">
                                    <HeartIcon size={15} />
                                    <p className="text-[10px] dark:text-gray-200">0</p>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Image src="/icon/comment.png" alt="Comment" width={15} height={15} className="dark:invert" />
                                    <p className="text-[10px] dark:text-gray-200">0</p>
                                </span>
                                <span>
                                    <Image src="/icon/reward.png" alt="Reward This Post" width={20} height={20} />
                                </span>
                            </div>

                            <span>
                                <Image src="/icon/share.png" alt="Share" width={15} height={15} className="dark:invert" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default CreateServerPost