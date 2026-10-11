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
    return (
        <div className="flex flex-col gap-2 md:flex-row pb-12">
            <div className="w-full md:w-2/3 border-0 md:border-r px-2">
                <div className="mt-4 md:mt-8">
                    <div className="bg-blue-300 rounded-3xl w-[34px] h-[34px]"></div>
                    <hr className="border-gray-300 mt-4" />
                    <div className="grid grid-cols-2 justify-start gap-2 md:gap-4 mt-4">
                        <div className="flex flex-col gap-2 text-xs sm:text-sm">
                            <div className="flex items-center justify-between">
                                <p>Wallet Address</p>
                                <p>:</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-xs sm:text-sm text-gray-500">
                            <p className="break-all">{address}</p>
                        </div>
                    </div>
                    <hr className="border-gray-300 mt-4" />

                    <div className="mt-4">
                        <h2 className="text-xs sm:text-sm">
                            {isDisconnected ? <span className="bg-red-400 text-white p-1 rounded-sm">Connect Wallet</span> : <span className="bg-green-400 text-white p-1 rounded-sm">Connect Wallet</span>} -
                            {alreadyRegister ? <span className="bg-green-400 text-white p-1 rounded-sm">Register</span> : <span className="bg-red-400 text-white p-1 rounded-sm">Register</span>} - 
                            {alreadyLogin ? <span className="bg-green-400 text-white p-1 rounded-sm">Login</span> : <span className="bg-red-400 text-white p-1 rounded-sm">Login</span>}
                        </h2>
                    </div>
                    <hr className="border-gray-300 mt-4" />

                    {/* explain */}
                    <div className="mt-4">
                        <h1 className="text-xl font-semibold">Built With Zero Knowledge Proof Technology</h1>
                        <p className="text-sm mt-2 opacity-75 leading-relaxed">
                            The application of zero-knowledge proofs on social media is the use of a cryptographic method that allows users to prove the validity of a specific claim to the platform or other users without having to disclose the personal data or sensitive information on which that claim is based.
                            <span className="font-semibold"> Simply: ur not need to input ur pesonal data to use the social media, but u can still prove that ur a real person and not a bot or fake account.</span>
                        </p>
                        <Link href="https://chain.link/education/zero-knowledge-proof-zkp" className="text-sm mt-2 opacity-75 text-blue-500 hover:underline">
                            More Explain
                        </Link>
                    </div>
                    <hr className="border-gray-300 mt-4" />
                    
                    <div className="mt-4">
                        <ConnectButton accountStatus="address" showBalance="false" />
                        {isDisconnected ? <p></p> : <p className="text-green-500 mt-1 font-semibold text-sm">connected!</p>}
                    </div>
                    <hr className="border-gray-300 mt-4" />
                    
                    {/* register */}
                    <div className="mt-4">
                        <button onClick={handleRegister} className="bg-[#4272FC] cursor-pointer text-sm text-white py-2 px-2 rounded-md hover:bg-[#3a68e6]">
                            Register with Your Wallet
                        </button>
                        {alreadyRegister ? <p className="text-green-500 mt-1 font-semibold text-sm">registered successfully!</p> : <p></p>}
                    </div>
                    <hr className="border-gray-300 mt-4" />

                    {/* login */}
                    <div className="mt-4">
                        <button onClick={handleLogin} className="bg-[#4272FC] cursor-pointer text-sm text-white py-2 px-2 rounded-md hover:bg-[#3a68e6]">
                            Login With Proof
                        </button>
                        {alreadyLogin ? <p className="text-green-500 mt-1 font-semibold text-sm">login successfully!</p> : <p></p>}
                    </div>
                </div>
            </div>

            <ConnectWallet />
        </div>
    )
}

export default Login