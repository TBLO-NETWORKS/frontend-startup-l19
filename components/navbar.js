import Link from "next/link"

const Navbar = () => {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700 h-[73px] transition-colors">
            <div className="px-4 md:px-6 h-full text-sm flex justify-center items-center">
                <Link
                    href="/search"
                    className="block border-2 border-blue-500 dark:border-blue-400 dark:bg-gray-800 dark:hover:bg-gray-700 w-[85%] text-center py-2 md:py-3 rounded-2xl text-gray-400 dark:text-gray-300 cursor-pointer transition-colors"
                >
                    Find ur interest
                </Link>
            </div>
        </div>
    )
}

export default Navbar