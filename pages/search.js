"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search as SearchIcon, SlidersHorizontal, Send, Users } from "lucide-react";
import { search } from "@/services/user";
import ConnectWallet from "@/components/connectWallet";

const TABS = [
    { key: "users", label: "Users" },
    { key: "servers", label: "Servers" },
    { key: "posts", label: "Posts" },
];

const emptyResults = { users: [], servers: [], posts: [] };

const truncateAddress = (addr = "") =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

const toDate = (value) => {
    if (!value) return null;
    const seconds = value.seconds ?? value._seconds;
    const date = seconds ? new Date(seconds * 1000) : new Date(value);
    return isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
    const date = toDate(value);
    if (!date) return "-";
    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const countComments = (comments) => {
    if (!comments) return 0;
    return Array.isArray(comments) ? comments.length : Object.keys(comments).length;
};

const UserCard = ({ user }) => {
    const address = user.hash ?? user.id;
    const name = user.displayName || truncateAddress(address);

    return (
        <Link
            href={`/${address}`}
            className="flex items-center gap-3 p-3 rounded-xl border dark:border-gray-600 dark:bg-gray-800 dark:shadow-md dark:shadow-black/40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-300 dark:bg-blue-400 text-white font-semibold uppercase shrink-0">
                {name.charAt(0)}
            </div>
            <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate dark:text-white">{name}</h3>
                {user.bio && (
                    <p className="text-xs text-gray-500 dark:text-gray-300 line-clamp-1">{user.bio}</p>
                )}
            </div>
        </Link>
    );
};

const ServerCard = ({ server }) => (
    <Link
        href={`/server/${server.id}`}
        className="p-4 rounded-xl border dark:border-gray-600 dark:bg-gray-800 dark:shadow-md dark:shadow-black/40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
    >
        <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold truncate dark:text-white">{server.serverName}</h3>
            {server.category && (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/25 dark:text-blue-200 text-xs font-medium capitalize">
                    {server.category}
                </span>
            )}
        </div>

        {server.desc && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-200 line-clamp-2">{server.desc}</p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-300">
            <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {server.members ?? 0} member
            </span>
            <span>Created at {formatDate(server.createdAt)}</span>
        </div>
    </Link>
);

const PostCard = ({ post }) => {
    const commentsCount = countComments(post.comments);
    const likesCount = post.likesCount ?? 0;

    return (
        <Link href={`/post/${post.id}`} className="border-b border-gray-300 dark:border-gray-700 pb-6">
            <div className="flex gap-2 items-center">
                <div className="bg-blue-300 dark:bg-blue-400 rounded-4xl p-4"></div>

                <div className="text-xs">
                    <h2 className="font-semibold dark:text-white">
                        {post.displayName ? post.displayName : truncateAddress(post.user)}
                    </h2>
                    <p className="opacity-50 dark:opacity-100 dark:text-gray-400">{formatDate(post.createdAt)}</p>
                    <p className="mt-1 dark:text-gray-100">{post.caption}</p>
                </div>
            </div>

            {post.image ? (
                <div className="mt-2 flex flex-col md:flex-row">
                    <div className="flex justify-between flex-row md:flex-col py-3 md:px-3 gap-6 order-2 md:order-1">
                        <div className="flex flex-row md:flex-col gap-6">
                            <button className="cursor-pointer flex md:flex-col items-center gap-1">
                                <Image src="/icon/like.png" alt="Like" width={20} height={20} className="dark:invert" />
                                <p className="text-[10px] dark:text-gray-200">{likesCount}</p>
                            </button>
                            <button className="cursor-pointer flex md:flex-col items-center gap-1">
                                <Image src="/icon/comment.png" alt="Comment" width={20} height={20} className="dark:invert" />
                                <p className="text-[10px] dark:text-gray-200">{commentsCount}</p>
                            </button>
                            <Link href={`/reward/${post.id}`} className="cursor-pointer">
                                <Image src="/icon/reward.png" alt="Reward This Post" width={25} height={25} />
                            </Link>
                        </div>

                        <button className="cursor-pointer">
                            <Image src="/icon/share.png" alt="Share" width={20} height={20} className="dark:invert" />
                        </button>
                    </div>

                    <div className="w-full h-[280px] sm:h-[375px] md:h-[300px] lg:h-[375px] md:w-[300px] lg:w-[375px] order-1 md:order-2 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <img
                            src={post.image}
                            alt={post.caption || "Post image"}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            ) : (
                <div className="mt-2">
                    <div className="flex justify-between py-1 md:px-2 gap-6">
                        <div className="flex gap-6">
                            <button className="cursor-pointer flex items-center gap-1">
                                <Image src="/icon/like.png" alt="Like" width={15} height={15} className="dark:invert" />
                                <p className="text-[10px] dark:text-gray-200">{likesCount}</p>
                            </button>
                            <button className="cursor-pointer flex items-center gap-1">
                                <Image src="/icon/comment.png" alt="Comment" width={15} height={15} className="dark:invert" />
                                <p className="text-[10px] dark:text-gray-200">{commentsCount}</p>
                            </button>
                            <Link href={`/reward/${post.id}`} className="cursor-pointer">
                                <Image src="/icon/reward.png" alt="Reward This Post" width={20} height={20} />
                            </Link>
                        </div>

                        <button className="cursor-pointer">
                            <Image src="/icon/share.png" alt="Share" width={15} height={15} className="dark:invert" />
                        </button>
                    </div>
                </div>
            )}
        </Link>
    );
};

const Search = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState(emptyResults);
    const [activeTab, setActiveTab] = useState("users");
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        const trimmed = query.trim();
        if (!trimmed) return;

        try {
            setLoading(true);
            const response = await search(trimmed);

            const data = {
                users: response?.data?.users ?? [],
                servers: response?.data?.servers ?? [],
                posts: response?.data?.posts ?? [],
            };

            setResults(data);
            setSearched(true);

            const firstWithResult = TABS.find((t) => data[t.key].length > 0);
            if (firstWithResult) setActiveTab(firstWithResult.key);
        } catch (err) {
            console.error(err);
            setResults(emptyResults);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    const activeItems = results[activeTab];

    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="w-full md:w-2/3 border-0 md:border-r dark:border-gray-700 px-2 text-gray-900 dark:text-white transition-colors">
                <div className="mt-4">
                    <div className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-2 h-10 px-3 rounded-full bg-gray-100 dark:bg-gray-800 dark:border dark:border-gray-600 dark:shadow-md dark:shadow-black/40 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 transition">
                            <SearchIcon className="w-4 h-4 text-black dark:text-gray-300 shrink-0" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Find ur Interest"
                                className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-400"
                            />
                        </label>

                        <button
                            type="button"
                            aria-label="Filter"
                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            <SlidersHorizontal className="w-4 h-4 text-black dark:text-gray-200" />
                        </button>

                        <button
                            type="button"
                            aria-label="Send search"
                            onClick={handleSearch}
                            disabled={!query.trim() || loading}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex border-b dark:border-gray-700">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 py-2 text-sm font-medium transition border-b-2 ${
                                    isActive
                                        ? "border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400"
                                        : "border-transparent text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white"
                                }`}
                            >
                                {tab.label}
                                {searched && (
                                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-300">
                                        ({results[tab.key].length})
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 flex flex-col gap-3">
                    {loading && (
                        <p className="text-sm text-gray-500 dark:text-gray-300 text-center py-6">Searching...</p>
                    )}

                    {!loading && searched && activeItems.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-300 text-center py-6">
                            Not Search Results for {activeTab}
                        </p>
                    )}

                    {!loading &&
                        activeTab === "users" &&
                        results.users.map((user, i) => (
                            <UserCard key={user.hash ?? user.id ?? i} user={user} />
                        ))}

                    {!loading &&
                        activeTab === "servers" &&
                        results.servers.map((server, i) => (
                            <ServerCard key={server.id ?? server.serverName ?? i} server={server} />
                        ))}

                    {!loading &&
                        activeTab === "posts" &&
                        results.posts.map((post, i) => (
                            <PostCard key={post.id ?? i} post={post} />
                        ))}
                </div>
            </div>

            <ConnectWallet />
        </div>
    );
};

export default Search;