import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useContext, useState, useCallback } from 'react'
import styles from '../styles/Room.module.css'
import { Layout } from '../components/Layout'
import { useRouter } from 'next/router'
import PoolActor from '../actors/solarFlares';
import { getDomain } from '../actors/icns';

import { Pool } from '../declarations/SolarFlares/SolarFlares.did'
import Loader from '../components/Loader';
import { Context } from "../services/context";
import { NFTDetails } from '@psychedelic/dab-js'
import EXTNFTActor from '../actors/nft/ext';
import { getNFTDetail } from '../actors/dab';
import { principalToAccountIdentifier, fromHexString, principalToAccountIdentifierFromSubAccountArray } from '../utils/ext'
import Ticket from '../components/Ticket'
import PurchaseConfirmation from '../components/PurchaseConfirmation';

import differenceInMinutes from 'date-fns/differenceInMinutes'
import differenceInSeconds from 'date-fns/differenceInSeconds'
import differenceInHours from 'date-fns/differenceInHours'
import differenceInDays from 'date-fns/differenceInDays'
import { Principal } from '@dfinity/principal'
import { GetServerSideProps } from 'next';
import { fetchPool, insertPool } from '../database';

const Name = (props: { principalText: string }) => {

  const [name, setName] = useState(props.principalText);

  useEffect(() => {

    getDomain(Principal.fromText(props.principalText)).then(domain => {
      console.log('doman', domain);
      if (domain) {
        setName(domain);
      }
    })

  }, [props.principalText]);

  return <span>{name}</span>

}

export interface ServerSideProps {
  roomId: string,
  name: string,
  index: string,
  url: string,
}

const Page = (props: ServerSideProps) => {

  const router = useRouter()
  const { id } = router.query as { id: string | null };

  const { accountIdentifier, principal, setShowLoginMenu } = useContext(Context);

  const [pool, setPool] = useState<Pool | null>(null);
  const [nft, setNft] = useState<NFTDetails | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [ticketNum, setTicketNum] = useState<number | undefined>(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [domain, setDomain] = useState<string | null>(null);

  const fetch = useCallback(async (poolId: string | null, shoLoader: boolean = false) => {

    if (poolId == null) { return }

    if (shoLoader) {
      Loader.show();
    }

    console.log('fetch', poolId)
    const actor = new PoolActor();
    await actor.createActor();
    console.log('createActor')

    const time = await actor.getTimestamp();
    if (time) {
      const t = new Date(parseInt((time / BigInt(1000000)).toString()));
      if (Math.abs(t.getTime() - new Date().getTime()) > 3 * 60 * 1000) {
        // time check
        Loader.dismiss()
        alert('Your system clock is not correct.')
        return
      }
    }

    const pools = await actor.getPool(poolId);
    console.log('pools', pools);
    if (pools && pools.length > 0) {
      const pool = pools[0] as Pool;
      setPool(pool);

      const nft = await getNFTDetail(pool.token.canisterId, 'EXT', parseInt(pool.token.index.toString()));
      setNft(nft);

      const domain = await getDomain(pool.owner);
      if (domain) {
        setDomain(domain);
      }
    }
    setLoaded(true);

    if (shoLoader) {
      Loader.dismiss();
    }

  }, [id]);

  useEffect(() => {

    fetch(id);

  }, [id])

  useEffect(() => {

    if (!loaded) {
      Loader.show();
    } else {
      Loader.dismiss();
    }

  }, [loaded])


  function createDiff(date: Date) {

    const now = new Date();

    if (date < now) {
      return null;
    }

    const daysDiff = differenceInDays(date, now)
    if (daysDiff > 0) {
      return `${daysDiff} day${daysDiff > 1 ? 's' : ''}`
    }
    const hoursDiff = differenceInHours(date, now)
    if (hoursDiff > 0) {
      return `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''}`
    }
    const minutesDiff = differenceInMinutes(date, now)
    if (minutesDiff > 0) {
      return `${minutesDiff} minute${minutesDiff > 1 ? 's' : ''}`
    }
    const secondsDiff = differenceInSeconds(date, now)
    return `${secondsDiff} second${secondsDiff > 1 ? 's' : ''}`
  }

  let dom = <div></div>

  if (nft && pool) {

    const sold = pool.tickets.reduce((prevValue, currentValue, currentIndex, array) => {
      return prevValue + parseInt(currentValue.count.toString())
    }, 0)

    const locked = pool.lockedTickets.reduce((prevValue, currentValue, currentIndex, array) => {
      const expired = (new Date()).getTime() > parseInt((currentValue.expiredAt / BigInt(1000000)).toString());
      return !expired ? prevValue + parseInt(currentValue.ticket.count.toString()) : prevValue;
    }, 0)

    const supply = parseInt(pool.supply.toString());
    const price = parseFloat(pool.price.toString());

    const now = new Date();
    const activeUntil = new Date(parseInt((pool.activeUntil / BigInt(1000000)).toString()))
    console.log('activeUntil', activeUntil)

    const isActive = new Date() < activeUntil;

    let mode: string = 'Active'
    console.log('aaaa', JSON.stringify(pool.status))
    if (JSON.stringify(pool.status).indexOf('InsufficientParticipants') > -1) {
      mode = 'InsufficientParticipants'
    } else if (JSON.stringify(pool.status).indexOf('Selected') > -1) {
      mode = (pool.status as any).Selected.winner.toString();
    }

    const soldOut = supply <= sold;

    let holdCount = 0;

    let tickets = pool.tickets.map(t => {
      if (t.participant.toString() == principal && pool) {
        holdCount += parseInt(t.count.toString());
        return <Ticket key={t.ticketId} ticket={t} pool={pool} mode={'purchased'} principal={principal} reload={() => {
          fetch(id, true);
        }} />
      }
    }).filter(t => t != undefined).reverse();

    let lockedTickets = pool.lockedTickets.map(l => {
      const t = l.ticket;
      if (t.participant.toString() == principal) {
        const expired = now.getTime() > parseInt((l.expiredAt / BigInt(1000000)).toString());
        return <Ticket key={t.ticketId} ticket={t} pool={pool} mode={expired ? 'expired' : 'unsettled'} principal={principal} reload={() => {
          fetch(id, true);
        }} />
      }
    }).filter(t => t != undefined).reverse();

    dom = <div className={styles.top}>

      <div className={styles.poolContainer}>

        <div className={styles.poolLeft}>

          <h1>{`${nft.name} #${nft.index}`}</h1>

          {mode == principal &&
            <p className={styles.announcementForWinner}>Congraturations 🎉 You are the winner!</p>
          }
          {principal && (mode != 'Active' && mode != 'InsufficientParticipants') && mode != principal && principal != pool.owner.toString() &&
            <p className={styles.announcementForLoser}>Oops! You are not selected this time 😱</p>
          }
          {principal && (mode != 'Active' && mode != 'InsufficientParticipants') && mode != principal && principal == pool.owner.toString() &&
            <p className={styles.announcementForLoser}>Your NFT has been transferred to the winner successfully!</p>
          }
          
          <p className={styles.provider}>Provider
            <a className={styles.owner} href={`https://dashboard.internetcomputer.org/account/${principalToAccountIdentifier(pool.owner.toString(), null)}`} target="_blank" rel="noreferrer">
              {domain ? domain : `${principalToAccountIdentifier(pool.owner.toString(), null).substring(0, 22)}...`}
            </a>
          </p>

          <div className={styles.numbers}>
            <p>
              <span className={styles.soldNumber}>{sold} / {supply}</span> <span className={styles.unitNumber}>sold</span>
              <span className={styles.lockedNumber}>{locked} <span className={styles.unitNumber}>locked</span></span>
            </p>
            <div className={styles.gauge}>
              <div className={styles.soldGauge} style={{ width: Math.floor((sold / supply) * 100) + '%' }}></div>
              <div className={styles.lockedGauge} style={{ width: Math.floor((locked / supply) * 100) + '%' }}></div>
            </div>
          </div>

          {holdCount > 0 &&
            <p className={styles.chanceToWinContainer}>Your odds of winning: <span className={styles.chanceToWin}>{(holdCount / supply * 100).toFixed(1)}%</span></p>
          }

          <div className={styles.applyContainer}>
            <p className={`${styles.applyButton} ${!isActive || soldOut ? styles.applyButtonDisabled : ''} `} onClick={async () => {

              if (activeUntil < new Date() || soldOut) { return }

              if (!ticketNum) { return }

              if (!principal) {
                setShowLoginMenu(true);
                return
              }

              const rest = supply - (locked + sold);
              if (ticketNum > rest) {
                alert(`You cannot purchase more than ${rest} tickets.`)
                setTicketNum(rest);
                return
              }

              let unsettled = 0;
              let unsettledTicketId = null;
              const now = new Date();
              pool.lockedTickets.forEach(l => {
                const expired = now.getTime() > parseInt((l.expiredAt / BigInt(1000000)).toString());
                if (!expired) {
                  unsettled = parseInt(l.ticket.count.toString());
                  unsettledTicketId = l.ticket.ticketId;
                }
              })

              if (unsettled) {
                const ok = confirm(`You have ${unsettled} unsettled ticket${unsettled > 1 ? 's' : ''}. Do you want to purchase ${unsettled > 1 ? 'them' : 'it'}?`);
                if (ok) {
                  setTicketNum(unsettled);
                  setShowConfirmation(true)
                }
                return;
              }

              setShowConfirmation(true);

            }}>{isActive && tickets.length == 0 ? 'Participate' : isActive ? 'Purchase more!' : 'Ended'}</p>

            <input type="number" disabled={!isActive} value={ticketNum} min={1} max={supply - locked - sold} onChange={e => {

              if (e.target.value == '') {
                setTicketNum(undefined);
                return
              }

              console.log('num', e.target.value)
              try {
                const num = parseInt(e.target.value);
                setTicketNum(num);
              } catch {

              }

            }} /> ticket{(ticketNum ?? 0) > 1 ? 's' : ''} = {(price * (ticketNum ?? 0) / 100000000).toFixed(2)} ICP

          </div>

          {mode == 'Active' &&
            <div>
              <p>A winner will be randomly selected from the participants.</p>
              <p>{'Ends in ' + createDiff(activeUntil) ?? ''}.</p>
            </div>
          }

          {mode == 'InsufficientParticipants' &&
            <p>{'This pool doesn\'t have enough participants.'}</p>
          }

          {mode != 'InsufficientParticipants' && mode != 'Active' &&
            <p>The winner is
              {' '}<Name principalText={mode} />!</p>
          }

        </div>

        <div className={styles.poolRight}>
          <img src={nft.url} alt={nft.name} />
        </div>
      </div>

      <p className={styles.ticketTitle}>Your Tickets</p>
      {(tickets.length + lockedTickets.length) > 0 &&
        <div className={styles.ticketContainer}>
          {tickets}
          {lockedTickets}
        </div>
      }
      {(tickets.length + lockedTickets.length) == 0 &&
        <div className={styles.ticketContainer}>
          <p>{'You own no ticket.'}</p>
        </div>
      }

      {showConfirmation && ticketNum && principal &&
        <PurchaseConfirmation pool={pool} nft={nft} ticketNum={ticketNum} principal={principal}
          close={(reload) => {

            setShowConfirmation(false)

            if (reload) { fetch(id, true) }
          }} />
      }

    </div>

  } else {


    dom = <div className={styles.top}>

      <div className={styles.poolContainer}>

        <div className={styles.poolLeft}>

          <h1>{`${props.name} #${props.index}`}</h1>

          <div className={styles.numbers}>
            <p>Fetching data from blockchain...</p>
          </div>

        </div>

        <div className={styles.poolRight}>
          <img src={props.url} alt={props.name} />
        </div>
      </div>

    </div>

  }


  return (
    <Layout>

      <Head>
        <title>{props.name} #{props.index} - SOLAR FLARES</title>
        <meta name="description" content="When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content={`${props.name} #${props.index} - SOLAR FLARES`} />
        <meta property="og:type" content="website" />
        <meta property="og:description" content={'When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor'} />
        <meta property="og:url" content={props.url} />
        <meta property="og:image" content={props.url} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:title" content={`${props.name} #${props.index} - SOLAR FLARES`} />
        <meta name="twitter:description" content={'When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor'} />
        <meta name="twitter:image" content={props.url} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <main className={styles.container}>
        {dom}
      </main>

    </Layout>
  )
}


export const getServerSideProps: GetServerSideProps = async ({ req, query, locale }) => {

  const { id } = query as { id: string | null };

  if (id) {

    const nft = await fetchPool(id);

    if (nft) {

      console.log('found', id)

      return { props: { name: nft.name, index: nft.index, url: nft.url } }

    } else {

      console.log('not found', id)

      const actor = new PoolActor();
      await actor.createActor();
  
      const pools = await actor.getPool(id);
      if (pools && pools.length > 0) {
        const pool = pools[0] as Pool;
        const nft = await getNFTDetail(pool.token.canisterId, 'EXT', parseInt(pool.token.index.toString()));
        if (nft.name && nft.index && nft.url && pool.activeUntil) {          
          insertPool(id, nft.name, parseInt(nft.index.toString()), nft.url, new Date(parseInt(pool.activeUntil.toString()) / 1000000), nft.canister, pool.price.toString(), parseInt(pool.supply.toString()))
          return { props: { name: nft.name, index: nft.index.toString(), url: nft.url } }
        }
      }
    }

  }

  throw Error('not found')
}

export default Page
