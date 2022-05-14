import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useContext, useState } from 'react'
import styles from '../styles/Home.module.css'
import { Layout } from '../components/Layout'
import { Context } from '../services/context';
import Loader from '../components/Loader';
import LotteryActor, { Lottery } from '../actors/lottery';
import { Principal } from '@dfinity/principal';
import Link from 'next/link'
import LotteryComponent from '../components/Lottery';

const Home: NextPage = () => {

  const { accountIdentifier, principal } = useContext(Context);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [mode, setMode] = useState<'' | 'participated' | 'provided'>('');

  async function fetch() {

    const isParticipated = location.href.indexOf('participated') > -1;

    console.log(isParticipated)
    const actor = new LotteryActor();
    await actor.createActor();

    Loader.show();
    const count = await actor.getTotalCount();

    if (!count) {
      Loader.dismiss();
      alert("Try again later.")
      return
    }

    const latest = parseInt(count.toString())

    const lotteries = await actor.getLotteries(Math.max(0, latest - 50), latest);
    Loader.dismiss();
    if (lotteries == null) {
      alert('Try again later.')
      return;
    }

    const ls: Lottery[] = [];
    lotteries.forEach(l => {
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

    setMode(isParticipated ? 'participated' : 'provided');
    setLotteries(ls.reverse());

  }

  useEffect(() => {

    if (accountIdentifier) {
      fetch()
    }

  }, [accountIdentifier, principal]);

  const doms = lotteries.map(l => {
    return <LotteryComponent lottery={l} />
  })

  return (
    <Layout>

      <Head>
        <title>SWAPP - Swap your NFTs safely on IC</title>
        <meta name="description" content="You can swap NFTs safely." />
        <link rel="icon" href="/favicon.ico" />

        <meta property="og:title" content={"SWAPP - Swap your NFTs safely on IC"} />
        <meta property="og:type" content="website" />
        <meta property="og:description" content={'You can swap NFTs safely.'} />
        <meta property="og:url" content="https://mb6s5-kqaaa-aaaad-qb5ta-cai.ic.fleek.co/ogp.jpg" />
        <meta property="og:image" content="https://mb6s5-kqaaa-aaaad-qb5ta-cai.ic.fleek.co/ogp.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:title" content={'SWAPP - Swap your NFTs safely on IC'} />
        <meta name="twitter:description" content={'You can swap NFTs safely.'} />
        <meta name="twitter:image" content="https://mb6s5-kqaaa-aaaad-qb5ta-cai.ic.fleek.co/ogp.jpg" />
        <meta name="twitter:card" content="summary_large_image" />

      </Head>

      <main className={styles.container}>

        {mode != '' &&
          <div className={styles.main}>
            <h2>NFTs you {mode}</h2>
          </div>
        }

        {mode != '' && lotteries.length == 0 &&
          <p style={{ textAlign: 'center' }}>No lotteries found.</p>
        }

        {mode != '' &&

          <div className={styles.lotteriesContainer}>
            {doms}
          </div>
        }
      </main>

    </Layout>
  )
}

export default Home
