import { Poppins } from 'next/font/google'
import Head from 'next/head'
import Navbar from './navbar'
import Sidebar from './sidebar'

const poppins = Poppins({ 
  subsets: ['latin'], 
  weight: ['200', '400', '600', '800']
})
 
export default function Layout({ children }) {
  return (
    <>
      <Head>
        <title>Startup</title>
      </Head>
      <main className={`${poppins.className}`}>
        <Navbar />
        <Sidebar />

        {/* pt-navbar selalu ada; pb-bottombar hanya mobile; ml-sidebar hanya desktop */}
        <div className="pt-[73px] pb-16 md:pb-0 md:ml-[25%] min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 transition-colors">
          {children}
        </div>
      </main>
    </>
  )
}