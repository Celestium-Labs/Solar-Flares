import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useContext, useState, useCallback } from 'react'
import styles from '../styles/Room.module.css'
import { Layout } from '../components/Layout'
import { useRouter } from 'next/router'
import LotteryActor from '../actors/lottery';
import LedgerActor, { TRANSFER_FEE } from '../actors/ledger';

import { Lottery__1 as Lottery } from '../declarations/lottery/lottery.did'
import Loader from '../components/Loader';
import { Context } from "../services/context";
import { Principal } from '@dfinity/principal'
import { NFTDetails } from '@psychedelic/dab-js'
import EXTNFTActor from '../actors/nft/ext';
import { getNFTDetail } from '../actors/dab';
import Swap from '../components/svg/swap';
import { principalToAccountIdentifier, fromHexString, principalToAccountIdentifierFromSubAccountArray } from '../utils/ext'
import Ticket from '../components/Ticket'
import PurchaseConfirmation from '../components/PurchaseConfirmation';

const Page: NextPage = () => {

  const router = useRouter()
  const { id } = router.query as { id: string | null };

  const { accountIdentifier, principal } = useContext(Context);

  const [lottery, setLottery] = useState<Lottery | null>(null);
  const [nft, setNft] = useState<NFTDetails | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [ticketNum, setTicketNum] = useState<number | undefined>(1);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const fetch = useCallback(async (lotteryId: string | null) => {

    if (lotteryId == null) { return }

    console.log('fetch', lotteryId)
    const actor = new LotteryActor();
    await actor.createActor();
    console.log('createActor')
    const lotteries = await actor.getLottery(lotteryId);
    console.log('lotteries', lotteries);
    if (lotteries && lotteries.length > 0) {
      const lottery = lotteries[0] as Lottery;
      setLottery(lottery);

      const nft = await getNFTDetail(lottery.token.canisterId, 'EXT', parseInt(lottery.token.index.toString()));
      setNft(nft);
    }
    setLoaded(true);
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

  let dom = <div></div>

  if (nft && lottery) {

    const sold = lottery.tickets.reduce((prevValue, currentValue, currentIndex, array) => {
      return prevValue + parseInt(currentValue.count.toString())
    }, 0)

    const locked = lottery.lockedTickets.reduce((prevValue, currentValue, currentIndex, array) => {
      return prevValue + parseInt(currentValue.ticket.count.toString())
    }, 0)

    const supply = parseInt(lottery.supply.toString());
    const price = parseFloat(lottery.price.toString());

    const now = new Date();
    const activeUntil = new Date(parseInt((lottery.activeUntil / BigInt(1000000)).toString()))
    console.log('activeUntil', activeUntil)

    const isActive = new Date() < activeUntil;

    const soldOut = supply <= sold;

    let holdCount = 0;

    let tickets = lottery.tickets.map(t => {
      if (t.participant.toString() == principal && lottery) {
        holdCount += parseInt(t.count.toString());
        return <Ticket ticket={t} lottery={lottery} mode={'purchased'} />
      }
    }).filter(t => t != undefined);

    let lockedTickets = lottery.lockedTickets.map(l => {
      const t = l.ticket;
      if (t.participant.toString() == principal) {
        const expired = now.getTime() > parseInt((l.expiredAt / BigInt(1000000)).toString());
        return <Ticket ticket={t} lottery={lottery} mode={expired ? 'expired' : 'unsettled'} />
      }
    }).filter(t => t != undefined);

    dom = <div className={styles.top}>

      <div className={styles.lotteryContainer}>

        <div className={styles.lotteryLeft}>

          <h1>{`${nft.name} #${nft.index}`}</h1>

          <p>Owner</p>
          <p>{lottery.owner.toString()}</p>

          <div className={styles.numbers}>
            <p>
              <span className={styles.soldNumber}>{sold} / {supply} sold</span>
              <span className={styles.lockedNumber}>{locked} locked</span>
            </p>
            <div className={styles.gauge}>
              <div className={styles.soldGauge} style={{ width: Math.floor((sold / supply) * 100) + '%' }}></div>
              <div className={styles.lockedGauge} style={{ width: Math.floor((locked / supply) * 100) + '%' }}></div>
            </div>
          </div>

          {holdCount > 0 &&
            <p className={styles.chanceToWinContainer}>Odds of winning: <span className={styles.chanceToWin}>{(holdCount / supply * 100)}%</span></p>
          }

          <div className={styles.applyContainer}>
            <p className={`${styles.applyButton} ${!isActive || soldOut ? styles.applyButtonDisabled : ''} `} onClick={async () => {

              if (activeUntil < new Date() || soldOut) { return }

              if (!ticketNum || !principal) { return }

              const rest = supply - (locked + sold);
              if (ticketNum > rest) {
                alert(`You cannot purchase more than ${rest} tickets.`)
                return
              }

              setShowConfirmation(true);

            }}>{soldOut ? 'Sold out!' : isActive ? 'Participate' : 'Ended'}</p>

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

            }} /> ticket{ticketNum ?? 0 > 1 ? 's' : ''} = {(price * (ticketNum ?? 0) / 100000000).toFixed(2)} ICP

          </div>

          <p>A winner will be selected randomly among the participants after {activeUntil.toLocaleString()}.</p>
        </div>

        <div className={styles.lotteryRight}>
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
          <p>You have purchased no ticket.</p>
        </div>
      }

      {showConfirmation && ticketNum && principal &&
        <PurchaseConfirmation lottery={lottery} nft={nft} ticketNum={ticketNum} principal={principal}
          close={(reload) => {

            setShowConfirmation(false)

            if (reload) { fetch(id) }
          }} />
      }

    </div>

  }


  return (
    <Layout>

      <Head>
        <title>SWAPP - Swap your NFTs safely on IC</title>
        <meta name="description" content="You can swap NFTs safely." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.container}>
        {dom}
      </main>

    </Layout>
  )
}

export default Page
