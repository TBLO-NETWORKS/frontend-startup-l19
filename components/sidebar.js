import Link from 'next/link'
import Image from 'next/image'
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const SunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)

const MoonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const SidebarItemSkeleton = () => (
  <div className="py-3 px-3 rounded-xl flex items-center gap-3 animate-pulse">
    <div className="w-6 h-6 shrink-0 rounded-md bg-gray-200 dark:bg-gray-700"></div>
    <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
  </div>
)

const BottomItemSkeleton = () => (
  <div className="flex items-center justify-center w-12 h-12 animate-pulse">
    <div className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700"></div>
  </div>
)

const Sidebar = () => {
  const [hashAddress, setHashAddress] = useState("")
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [isDark, setIsDark] = useState(false)

  const router = useRouter()

  const checkToken = async() => {
    try {
      const token = await Cookies.get("token")
      if(token) {
        const jwtToken = atob(token)
        const payload = jwtDecode(jwtToken)
        const hashFromPayload = payload.hash
        setHashAddress(hashFromPayload)
      }
    } finally {
      setLoadingAuth(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = saved ? saved === 'dark' : prefersDark
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleDarkMode = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const profileHref = hashAddress ? `/${hashAddress}` : '/login'
  const serverHref = hashAddress ? `/${hashAddress}/joined-server` : '/login'
  const createPostHref = hashAddress ? '/post/create' : '/login'
  const createServerHref = hashAddress ? '/server/create' : '/login'

  const sidebarItems = [
    { label: 'Home', icon: '/icon/homepage.png', href: '/' },
    { label: 'Your Server', icon: '/icon/community.png', href: serverHref },
    { label: 'Messages', icon: '/icon/messages.png', href: '/chats' },
    { label: 'Notifications', icon: '/icon/notifications.png', href: '/notifications' },
    { label: hashAddress ? 'Profile' : 'Login', icon: hashAddress ? '/icon/wallet.png' : '/icon/login.png', href: profileHref, auth: true },
    { label: 'Create Server', icon: '/icon/add.png', href: createServerHref },
  ]

  const bottomItems = [
    { label: 'Home', icon: '/icon/homepage.png', href: '/' },
    { label: 'Your Server', icon: '/icon/community.png', href: serverHref },
    { label: 'Post', icon: '/icon/add_white.png', href: createPostHref, primary: true },
    { label: 'Notifications', icon: '/icon/notifications.png', href: '/notifications' },
    { label: hashAddress ? 'Profile' : 'Login', icon: hashAddress ? '/icon/wallet.png' : '/icon/login.png', href: profileHref, auth: true },
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
          border-r bg-white dark:bg-black dark:border-gray-800 px-1 lg:px-6
          text-sm transition-colors
        "
      >
        <div className="flex flex-col gap-1 mt-4 flex-1">
          <Link
            href={createPostHref}
            className="mb-3 bg-[#4272FC] hover:bg-blue-500 text-white text-sm font-medium py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <Image src="/icon/add_white.png" alt="Create Post" width={20} height={20} />
            <span className="hidden lg:inline">Create Post</span>
            <span className="lg:hidden">Post</span>
          </Link>

          {sidebarItems.map((item) => {
            if (item.auth && loadingAuth) return <SidebarItemSkeleton key="auth-skeleton" />

            const active = isActive(item.href)

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`py-3 px-3 rounded-xl flex items-center gap-3 transition-colors ${
                  active
                    ? 'bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'
                }`}
              >
                <Image src={item.icon} alt={item.label} width={24} height={24} className="shrink-0 dark:invert" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={isDark}
          className="mb-4 py-3 px-3 rounded-xl flex items-center gap-3 transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/70"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
          <span className="truncate">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <div
        className="
          md:hidden
          fixed bottom-0 left-0 right-0 z-40
          bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800
          pb-[env(safe-area-inset-bottom)] transition-colors
        "
      >
        <div className="h-16 flex items-center justify-around px-2">
          {bottomItems.map((item) => {
            if (item.auth && loadingAuth) return <BottomItemSkeleton key="auth-skeleton" />

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
                  className={`dark:invert ${active ? 'opacity-100' : 'opacity-50'}`}
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