import Link from "next/link";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { getJoinedServers, getMyServers } from "@/services/server";
import { useRouter } from "next/router";
import ConnectWallet from "@/components/connectWallet";

const ServerSkeleton = () => (
    <div className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-4 px-3 rounded-md flex gap-2 items-center animate-pulse">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex flex-col gap-2">
            <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-2.5 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
    </div>
)

const Server = () => {
    const [myServers, setMyServers] = useState([])
    const [servers, setServers] = useState([])
    const [loading, setLoading] = useState(true)

    const router = useRouter()
    const { hashAddress } = router.query

    const fetchMyServers = async() => {
        const response = await getMyServers()
        if(!response) {
            toast.error("Failed to fetch servers!")
        } else {
            setMyServers(response.data)
        }
    }

    const fetchJoinedServers = async() => {
        const response = await getJoinedServers(hashAddress)
        if(!response) {
            toast.error("Failed to fetch servers!")
        } else {
            setServers(response.data)
        }
    }

    useEffect(() => {
        if(hashAddress) {
            setLoading(true)
            Promise.all([fetchMyServers(), fetchJoinedServers()]).finally(() => setLoading(false))
        }
    }, [hashAddress])
    return(
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="w-full md:w-2/3 border-0 md:border-r dark:border-gray-700 px-2 text-gray-900 dark:text-white transition-colors">
                <div className="mt-2 md:mt-4">
                    <h1 className="text-lg font-semibold dark:text-white">Your Joined Server's</h1>
                    <hr className="border-gray-300 dark:border-gray-700 mt-4" />

                    <div className="mt-4 grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-2">
                        {loading ? (
                            <>
                                <ServerSkeleton />
                                <ServerSkeleton />
                                <ServerSkeleton />
                                <ServerSkeleton />
                            </>
                        ) : (
                            <>
                                {myServers?.map((server) => (
                                    <Link key={server.id} href={`/server/${server.id}`} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:hover:bg-gray-700 dark:shadow-md dark:shadow-black/40 py-4 px-3 rounded-md flex gap-2 items-center transition-colors">
                                        <div className="p-4 rounded-4xl bg-blue-300 dark:bg-blue-400"></div>
                                        <div>
                                            <h1 className="text-sm dark:text-white">{server.serverName}</h1>
                                            <p className="text-xs text-gray-500 dark:text-gray-300">{server.members} <span className="text-black dark:text-white font-semibold">member</span></p>
                                        </div>
                                    </Link>
                                ))}
                                {servers.map((server) => (
                                    <Link key={server.id} href={`/server/${server.id}`} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:hover:bg-gray-700 dark:shadow-md dark:shadow-black/40 py-4 px-3 rounded-md flex gap-2 items-center transition-colors">
                                        <div className="p-4 rounded-4xl bg-blue-300 dark:bg-blue-400"></div>
                                        <div>
                                            <h1 className="text-sm dark:text-white">{server.serverName}</h1>
                                            <p className="text-xs text-gray-500 dark:text-gray-300">{server.members} <span className="text-black dark:text-white font-semibold">member</span></p>
                                        </div>
                                    </Link>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default Server