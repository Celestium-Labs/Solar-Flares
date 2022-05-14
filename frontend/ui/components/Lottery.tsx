import { useState, useEffect, useContext } from "react";
import styles from '../styles/components/Lottery.module.css'
import { Context } from "../services/context";
import Link from 'next/link'
import { Lottery, } from '../actors/lottery';
import { getNFTDetail } from '../actors/dab';
import { NFTDetails } from '@psychedelic/dab-js'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import differenceInSeconds from 'date-fns/differenceInSeconds'
import differenceInHours from 'date-fns/differenceInHours'
import differenceInDays from 'date-fns/differenceInDays'

type IProps = {
  lottery: Lottery,
}

export default function Component({ lottery }: IProps) {

  const [nft, setNft] = useState<NFTDetails | null>(null);

  useEffect(() => {

    console.log('in')

    getNFTDetail(lottery.token.canisterId, 'EXT', parseInt(lottery.token.index.toString())).then(nft => {
      setNft(nft);
    });

  }, [lottery]);

  // console.log('----')
  // console.log(lottery.activeUntil)
  // console.log(new Date().getTime())

  if (!nft) {
    return <div>loading</div>
  }

  const now = new Date();
  const activeUntil = new Date(parseInt((lottery.activeUntil / BigInt(1000000)).toString()));
  const name = `${nft.name} #${nft.index}`
  const status = now < activeUntil ? 'Active' : 'Finished';

  function createDiff() {

    if (activeUntil < now) {
      return null;
    }

    const daysDiff = differenceInDays(activeUntil, now)
    if (daysDiff > 0) {
      return `${daysDiff} day${daysDiff > 1 ? 's' : ''}`
    }
    const hoursDiff = differenceInHours(activeUntil, now)
    if (hoursDiff > 0) {
      return `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''}`
    }
    const minutesDiff = differenceInMinutes(activeUntil, now)
    if (minutesDiff > 0) {
      return `${minutesDiff} minute${minutesDiff > 1 ? 's' : ''}`
    }
    const secondsDiff = differenceInSeconds(activeUntil, now)
    return `${secondsDiff} second${secondsDiff > 1 ? 's' : ''}`
  }

  const diff = createDiff();

  return <div className={styles.container}>
    <Link href={`/nft/?id=${lottery.id}`}>
      <a>
        <img src={nft.url} alt={name} />

        <div className={styles.textContainer}>
          <p className={styles.name}>{name}</p>
          <p className={`${styles.status} ${status == 'Active' ? styles.active : ''}`}>{status}</p>
          <div className={styles.priceContainer}>
            <p className={styles.price}>{(parseFloat(lottery.price.toString()) / 100000000).toFixed(2)} ICP</p>
            <p className={styles.date}>{diff ? ('Ends in ' + diff) : 'Ended'}</p>
          </div>
        </div>

      </a>
    </Link>
  </div>
}