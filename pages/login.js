import Link from "next/link"
import { useAccount, useAccountEffect } from 'wagmi';
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ConnectWallet from "@/components/connectWallet"
import { setRegister, setLogin } from "@/services/auth";
import { useState, useEffect } from "react";

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
    </svg>
)

const ShieldIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
)

const Login = () => {
    const { address, isDisconnected } = useAccount();
    const [alreadyRegister, setAlreadyRegister] = useState(false)
    const [alreadyLogin, setAlreadyLogin] = useState(false)
    const [hashAddress, setHashAddress] = useState("")

    const router = useRouter()

    const handleRegister = async() => {
        if(!address) {
            toast.error("connect ur wallet first!")
            return
        }
        const response = await setRegister({ address })
        if(response.error) {
            toast.error(response.message)
            setAlreadyRegister(true)
        } else {
            toast.success("success registering ur address!")
            setAlreadyRegister(true)
        }
    }

    const handleLogin = async() => {
        if(!address) {
            toast.error("connect ur wallet first!")
            return
        }

        const response = await setLogin({ address })
        if(response.error) {
            toast.error(response.message)
        } else {
            const token = response.data.data
            const tokenBase64 = btoa(token)

            Cookies.set("token", tokenBase64, { expires: 7 })

            setAlreadyLogin(true)
            toast.success("login success!")
            router.push(`/`)
        }
    }

    const checkToken = () => {
        const token = Cookies.get("token")
        if(!token) return

        try {
            const jwtToken = atob(token)
            const payload = jwtDecode(jwtToken)

            const hashFromPayload = payload.hash
            setHashAddress(hashFromPayload)

            setAlreadyRegister(true)
            setAlreadyLogin(true)
        } catch (error) {
            console.error("Invalid token cookie", error)
            Cookies.remove("token")
        }
    }

    useAccountEffect({
        onDisconnect() {
            Cookies.remove("token")
            setAlreadyRegister(false)
            setAlreadyLogin(false)
        },
    })

    useEffect(() => {
        checkToken()
    }, [])

    const connected = !isDisconnected

    const steps = [
        { label: "Connect", done: connected },
        { label: "Register", done: alreadyRegister },
        { label: "Login", done: alreadyLogin },
    ]

    const cardClass = "rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 shadow-sm dark:shadow-md dark:shadow-black/40 transition-colors"

    return (
        <div className="flex flex-col gap-2 md:flex-row pb-12">
            <div className="w-full md:w-2/3 border-0 md:border-r dark:border-gray-700 px-2 text-gray-900 dark:text-white transition-colors">
                <div className="mt-4 md:mt-8 flex flex-col gap-4">
                    <div className="flex items-center justify-center gap-3">
                        <div className="min-w-0">
                            <h1 className="text-lg text-center font-bold leading-tight">
                                <span className="bg-orange-500 text-white px-1">TBLONETWORKS</span>
                            </h1>
                            
                        </div>
                    </div>

                    <div className={`${cardClass} mt-1`}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-400">Wallet Address</p>
                        <p className="mt-1 text-xs sm:text-sm font-mono break-all text-gray-700 dark:text-gray-100">
                            {address ? address : "Not connected"}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        {steps.map((step, i) => (
                            <div
                                key={step.label}
                                className={`rounded-2xl border p-3 flex flex-col items-center gap-2 text-center transition-colors ${
                                    step.done
                                        ? "border-green-300 bg-green-50 dark:border-green-500/50 dark:bg-green-500/15"
                                        : "border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
                                }`}
                            >
                                <span
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        step.done
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-200"
                                    }`}
                                >
                                    {step.done ? <CheckIcon /> : i + 1}
                                </span>
                                <div>
                                    <p className="text-xs sm:text-sm font-semibold">{step.label}</p>
                                    <p className={`text-[11px] ${step.done ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-300"}`}>
                                        {step.done ? "Done" : "Pending"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={cardClass}>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#4272FC] text-white text-xs font-bold flex items-center justify-center">1</span>
                            <h2 className="text-sm font-semibold">Connect your wallet</h2>
                        </div>
                        <div className="mt-3">
                            <ConnectButton accountStatus="address" showBalance="false" />
                            {isDisconnected ? <p></p> : <p className="text-green-500 dark:text-green-400 mt-2 font-semibold text-sm">connected!</p>}
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#4272FC] text-white text-xs font-bold flex items-center justify-center">2</span>
                            <h2 className="text-sm font-semibold">Register your address</h2>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">First time here? Register once to create your account.</p>
                        <div className="mt-3">
                            <button onClick={handleRegister} className="bg-[#4272FC] cursor-pointer text-sm font-medium text-white py-2.5 px-5 rounded-xl hover:bg-[#3a68e6] shadow-lg shadow-blue-500/30 dark:shadow-black/40 transition-colors">
                                Register with Your Wallet
                            </button>
                            {alreadyRegister ? <p className="text-green-500 dark:text-green-400 mt-2 font-semibold text-sm">registered successfully!</p> : <p></p>}
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#4272FC] text-white text-xs font-bold flex items-center justify-center">3</span>
                            <h2 className="text-sm font-semibold">Login with proof</h2>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Prove you own this wallet to start your session.</p>
                        <div className="mt-3">
                            <button onClick={handleLogin} className="bg-[#4272FC] cursor-pointer text-sm font-medium text-white py-2.5 px-5 rounded-xl hover:bg-[#3a68e6] shadow-lg shadow-blue-500/30 dark:shadow-black/40 transition-colors">
                                Login With Proof
                            </button>
                            {alreadyLogin ? <p className="text-green-500 dark:text-green-400 mt-2 font-semibold text-sm">login successfully!</p> : <p></p>}
                        </div>
                    </div>
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default Login