import { useState, useEffect, useContext } from "react";
import styles from '../styles/components/Pool.module.css'
import { Context } from "../services/context";
import Link from 'next/link'
import { Pool, } from '../actors/solarFlares';
import { getNFTDetail } from '../actors/dab';
import { NFTDetails } from '@psychedelic/dab-js'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import differenceInSeconds from 'date-fns/differenceInSeconds'
import differenceInHours from 'date-fns/differenceInHours'
import differenceInDays from 'date-fns/differenceInDays'

type IProps = {
  pool: Pool,
}

export default function Component({ pool }: IProps) {

  const [nft, setNft] = useState<NFTDetails | null>(null);

  useEffect(() => {

    console.log('in')

    getNFTDetail(pool.token.canisterId, 'EXT', parseInt(pool.token.index.toString())).then(nft => {
      setNft(nft);
    });

  }, [pool]);

  // console.log('----')
  // console.log(pool.activeUntil)
  // console.log(new Date().getTime())

  if (!nft) {
    return <div>loading</div>
  }

  const now = new Date();
  const activeUntil = new Date(parseInt((pool.activeUntil / BigInt(1000000)).toString()));
  const name = `${nft.name} #${nft.index}`
  const status = now < activeUntil ? 'Active' : 'Finished';

  const sold = pool.tickets.reduce((prevValue, currentValue, currentIndex, array) => {
    return prevValue + parseInt(currentValue.count.toString())
  }, 0)

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
    <Link href={`/pool/?id=${pool.id}`}>
      <a>
        <img src={nft.url} alt={name} />

        <div className={styles.textContainer}>
          <p className={styles.name}>{name}</p>
          <div className={styles.mainTextContainer}>
            <p className={styles.price}>{(parseFloat(pool.price.toString()) / 100000000).toFixed(2)} ICP</p>
            {status == 'Active' &&
              <p className={`${styles.status} ${styles.active}`}>Active</p>
            }
          </div>
          <div className={styles.subTextContainer}>
            <p className={styles.number}>{sold} / {pool.supply.toString()} sold</p>
            <p className={styles.date}>{diff ? ('Ends in ' + diff) : 'Ended'}</p>
          </div>
        </div>

      </a>
    </Link>
  </div>
}