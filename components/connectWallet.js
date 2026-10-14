import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useAccountEffect } from 'wagmi';
import { useEffect } from 'react';
import Cookies from 'js-cookie';

const PARTNERS = [
  { name: '', link: '#', category: '' },
  { name: '', link: '#', category: '' },
  { name: '', link: '#', category: '' },
];

const ConnectWallet = () => {
  const partners = PARTNERS.filter((p) => p.name);
  const { status } = useAccount();

  useAccountEffect({
    onDisconnect() {
      Cookies.remove('token');
      window.location.reload();
    },
  });

  return (
    <aside className="hidden md:block md:w-1/3 md:max-w-xs lg:max-w-sm md:shrink-0">
      <div className="w-full space-y-4 md:sticky md:top-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors dark:border-gray-600 dark:bg-gray-800 dark:shadow-black/40">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-full bg-orange-500 ring-2 ring-orange-400/40 sm:h-14 sm:w-14" />
            <div className="min-w-0 text-left">
              <h2 className="truncate text-base font-bold leading-tight text-gray-900 dark:text-white sm:text-lg">
                TBLO
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-300">Connect Your Wallet</p>
            </div>
          </div>

          <div className="my-3 h-px w-full bg-gray-100 dark:bg-gray-600" />

          <div className="flex justify-center">
            <ConnectButton
              accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
              chainStatus={{ smallScreen: 'icon', largeScreen: 'full' }}
              showBalance={false}
            />
          </div>
        </div>

        {partners.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors dark:border-gray-600 dark:bg-gray-800 dark:shadow-black/40">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Our Partnership</h3>
            <ul className="mt-3 space-y-3">
              {partners.map((partner) => (
                <li
                  key={`${partner.name}-${partner.link}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                      {partner.name}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-300">
                      {partner.category}
                    </p>
                  </div>
                  <a
                    href={partner.link}
                    className="shrink-0 text-xs font-semibold text-sky-500 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                  >
                    See
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ConnectWallet;