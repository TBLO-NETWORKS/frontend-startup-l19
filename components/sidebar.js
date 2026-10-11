import Link from 'next/link'
import Image from 'next/image'
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const Sidebar = () => {
  const [hashAddress, setHashAddress] = useState("")

  const router = useRouter()

  const checkToken = async() => {
    const token = await Cookies.get("token")
    if(token) {
      const jwtToken = atob(token)
      const payload = jwtDecode(jwtToken)
      const hashFromPayload = payload.hash
      setHashAddress(hashFromPayload)
    }
  }

  const profileHref = hashAddress ? `/${hashAddress}` : '/login'
  const serverHref = hashAddress ? `/${hashAddress}/joined-server` : '/login'
  const createPostHref = hashAddress ? '/post/create' : '/login'
  const createServerHref = hashAddress ? '/server/create' : '/login'

  const sidebarItems = [
    { label: 'Home', icon: '/icon/homepage.png', href: '/' },
    { label: 'Your Server', icon: '/icon/community.png', href: serverHref },
    { label: 'Notifications', icon: '/icon/notifications.png', href: '/notifications' },
    { label: hashAddress ? 'Profile' : 'Login', icon: hashAddress ? '/icon/wallet.png' : '/icon/login.png', href: profileHref },
    { label: 'Create Server', icon: '/icon/add.png', href: createServerHref },
  ]

  const bottomItems = [
    { label: 'Home', icon: '/icon/homepage.png', href: '/' },
    { label: 'Your Server', icon: '/icon/community.png', href: serverHref },
    { label: 'Post', icon: '/icon/add_white.png', href: createPostHref, primary: true },
    { label: 'Notifications', icon: '/icon/notifications.png', href: '/notifications' },
    { label: hashAddress ? 'Profile' : 'Login', icon: hashAddress ? '/icon/wallet.png' : '/icon/login.png', href: profileHref },
  ]

  const isActive = (href) => {
    const path = router.asPath.split('?')[0]
    return path === href
  }

  useEffect(() => {
    checkToken()
  }, [router.asPath])
  return (
    <>
      <div
        className="
          hidden md:flex flex-col
          fixed top-[73px] left-0 z-40
          w-1/4 h-[calc(100vh-73px)]
          border-r bg-white px-1 lg:px-6
          text-sm
        "
      >
        <div className="flex flex-col gap-1 mt-4">
          <Link
            href={createPostHref}
            className="mb-3 bg-[#4272FC] hover:bg-blue-500 text-white text-sm font-medium py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <Image src="/icon/add_white.png" alt="Create Post" width={20} height={20} />
            <span className="hidden lg:inline">Create Post</span>
            <span className="lg:hidden">Post</span>
          </Link>

          {sidebarItems.map((item) => {
            const active = isActive(item.href)

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`py-3 px-3 rounded-xl flex items-center gap-3 transition-colors ${
                  active ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-600 hover:bg-gray-100/70'
                }`}
              >
                <Image src={item.icon} alt={item.label} width={24} height={24} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div
        className="
          md:hidden
          fixed bottom-0 left-0 right-0 z-40
          bg-white border-t border-gray-200
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <div className="h-16 flex items-center justify-around px-2">
          {bottomItems.map((item) => {
            const active = isActive(item.href)

            if (item.primary) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  className="w-8 h-8 -mt-1 rounded-2xl bg-[#4272FC] hover:bg-blue-500 shadow-lg shadow-blue-500/30 flex items-center justify-center transition-colors"
                >
                  <Image src={item.icon} alt={item.label} width={24} height={24} />
                </Link>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center w-12 h-12"
              >
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={24}
                  height={24}
                  className={active ? 'opacity-100' : 'opacity-50'}
                />
                {active && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#4272FC]"></span>}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default Sidebar