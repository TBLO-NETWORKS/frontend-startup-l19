import Link from "next/link"
import ConnectWallet from "@/components/connectWallet"

const PageNotFound = () => {
    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="w-full md:w-2/3 border-0 md:border-r dark:border-gray-700 px-2 text-gray-900 dark:text-white transition-colors">
                <div className="flex flex-col items-center justify-center min-h-[450px] text-center py-8">
                    <div className="relative">
                        <span className="absolute inset-0 -z-10 rounded-full bg-blue-500/20 dark:bg-blue-400/20 blur-3xl" />
                        <h1 className="text-7xl md:text-8xl font-extrabold tracking-tight bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                            404
                        </h1>
                    </div>

                    <div className="mt-2 w-16 h-1 rounded-full bg-orange-500" />

                    <h2 className="mt-5 text-xl md:text-2xl font-bold">Page Not Found</h2>
                    <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-300">
                        The page you are looking for does not exist, has been moved, or the link is incorrect.
                    </p>

                    <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                        <Link
                            href="/"
                            className="bg-[#4272FC] hover:bg-blue-500 text-white text-sm font-medium py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/30 dark:shadow-black/40 transition-colors"
                        >
                            Back to Home
                        </Link>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="text-sm font-medium py-3 px-6 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default PageNotFound