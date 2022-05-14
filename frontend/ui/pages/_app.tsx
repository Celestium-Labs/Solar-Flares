import '../styles/globals.css'
import React, { useEffect, useState, useRef } from 'react'
import type { AppProps } from 'next/app'
import type { NextPage } from 'next'
import type { ReactElement, ReactNode } from 'react'
import { Context } from '../services/context';
import { principalToAccountIdentifier } from "../utils/ext";
import { login, isLogged, logout, initStoicIdentity } from '../actors/wallet';
import Loader from '../components/Loader';
import EXTNFTActor from '../actors/nft/ext';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

let initialized = false;
export default function MyApp({ Component, pageProps }: AppPropsWithLayout) {

  const [accountIdentifier, setAccountIdentifier] = useState<string | null>(null);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  useEffect(() => {
    if (initialized) { return }
    initialized = true;
    initStoicIdentity();
    anonymousLogin();
  }, [initialized]);

  async function _login(wallet: 'plug' | 'stoic') {

    try {
      Loader.show('Connecting to a wallet.');
      console.log('1')
      const principalId = await login(wallet);
      console.log('2')
      Loader.dismiss();

      if (principal == 'failed') {
        alert('Failed to connect to a wallet.')
        return false;
      } else if (principalId) {
        setPrincipal(principalId.toString());
        setAccountIdentifier(principalToAccountIdentifier(principalId.toString(), 0));
        return true;
      }

      return false;

    } catch (e) {
      Loader.dismiss();
      console.log('3')
      return false;

    }

  }

  async function _logout() {
    logout();
    setAccountIdentifier(null);
  }

  async function anonymousLogin() {
    const principalId = await isLogged();
    if (principalId) {
      setPrincipal(principalId.toString());
      setAccountIdentifier(principalToAccountIdentifier(principalId.toString(), 0));

      // debug
      // const canisterId = 'rno2w-sqaaa-aaaaa-aaacq-cai'// nft.canister
      // const tokenIndex = principal?.toString() == 't4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe' ? 351 : 353 // BigInt(parseInt(nft.index + ''))
      // const actor = new EXTNFTActor(canisterId)
      // actor.createAgent().then(async _ => {
      //   const from = principal?.toString() == 't4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe' ? 't4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe' : 'pblec-idudb-zapy3-hr4c5-jc7uf-egrmy-y7bra-nma6q-cviq3-46zpu-sqe'
      //   const to = principal?.toString() == 't4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe' ? 'pblec-idudb-zapy3-hr4c5-jc7uf-egrmy-y7bra-nma6q-cviq3-46zpu-sqe' : 't4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe' 

      //   console.log("from", from, "to", to);
      //   const res1 = await actor.approve(tokenIndex, to);
      //   console.log("allowance!!!!!!", res1)
      //   const res = await actor.transfer(tokenIndex, from, to);
      //   console.log("TRANSFER!!!!!!", res)
      // })
    }
  }


  const getLayout = Component.getLayout ?? ((page) => page)
  return getLayout(
    <Context.Provider value={{ accountIdentifier, principal, login: _login, anonymousLogin, logout: _logout, showLoginMenu, setShowLoginMenu }}>
      <Component {...pageProps} />
    </Context.Provider>
  );
}
