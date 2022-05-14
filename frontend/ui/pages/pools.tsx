import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useContext, useState } from 'react'
import styles from '../styles/Home.module.css'
import { Layout } from '../components/Layout'
import { Context } from '../services/context';
import Loader from '../components/Loader';
import PoolActor, { Pool } from '../actors/solarFlares';
import { Principal } from '@dfinity/principal';
import Link from 'next/link'
import PoolComponent from '../components/Pool';

const Home: NextPage = () => {

  const { accountIdentifier, principal } = useContext(Context);
  const [pools, setLotteries] = useState<Pool[]>([]);
  const [mode, setMode] = useState<'' | 'participated' | 'created'>('');

  async function fetch() {

    const isParticipated = location.href.indexOf('participated') > -1;

    console.log(isParticipated)
    const actor = new PoolActor();
    await actor.createActor();

    Loader.show();
    const count = await actor.getTotalCount();

    if (!count) {
      Loader.dismiss();
      alert("Try again later.")
      return
    }

    const latest = parseInt(count.toString())

    const pools = await actor.getPools(Math.max(0, latest - 50), latest);
    Loader.dismiss();
    if (pools == null) {
      alert('Try again later.')
      return;
    }

    const ls: Pool[] = [];
    pools.forEach(l => {
      if (!isParticipated && principal == l.owner.toString()) {
        console.log('ccc')
        ls.push(l)
      } else if (isParticipated) {
        console.log('ddd')

        let has = false;
        l.tickets.forEach(t => {
          if (t.participant.toString() == principal) {
            console.log('1')
            has = true;
          }
        })
        l.lockedTickets.forEach(l => {
          const t = l.ticket;
          if (t.participant.toString() == principal) {
            console.log('2')
            has = true;
          }
        })

        if (has) {
          ls.push(l);
        }
      }
    })

    setMode(isParticipated ? 'participated' : 'created');
    setLotteries(ls.reverse());

  }

  useEffect(() => {

    if (accountIdentifier) {
      fetch()
    }

  }, [accountIdentifier, principal]);

  const doms = pools.map(pool => {
    return <PoolComponent pool={pool} />
  })

  return (
    <Layout>

      <Head>
        <title>Solar Flares - Get an NFT on IC</title>
        <meta name="description" content="When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor" />
        <link rel="icon" href="/favicon.ico" />

        <meta property="og:title" content={"Solar Flares - Get an NFT on IC"} />
        <meta property="og:type" content="website" />
        <meta property="og:description" content={'When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor'} />
        <meta property="og:url" content="https://mb6s5-kqaaa-aaaad-qb5ta-cai.ic.fleek.co/ogp.jpg" />
        <meta property="og:image" content="https://mb6s5-kqaaa-aaaad-qb5ta-cai.ic.fleek.co/ogp.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:title" content={'Solar Flares - Get an NFT on IC'} />
        <meta name="twitter:description" content={'When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor'} />
        <meta name="twitter:image" content="https://mb6s5-kqaaa-aaaad-qb5ta-cai.ic.fleek.co/ogp.jpg" />
        <meta name="twitter:card" content="summary_large_image" />

      </Head>

      <main className={styles.container}>

        {mode != '' &&
          <div className={styles.main}>
            <h2>Pools you {mode}</h2>
          </div>
        }

        {mode != '' && pools.length == 0 &&
          <p style={{ textAlign: 'center' }}>No pools found.</p>
        }

        {mode != '' &&

          <div className={styles.poolsContainer}>
            {doms}
          </div>
        }
      </main>

    </Layout>
  )
}

export default Home
