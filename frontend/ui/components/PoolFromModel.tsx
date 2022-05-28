import { useState, useEffect, useContext, useCallback } from "react";
import styles from '../styles/components/Pool.module.css'
import { Context } from "../services/context";
import Link from 'next/link'
import { getNFTDetail } from '../actors/dab';
import { NFTDetails } from '@psychedelic/dab-js'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import differenceInSeconds from 'date-fns/differenceInSeconds'
import differenceInHours from 'date-fns/differenceInHours'
import differenceInDays from 'date-fns/differenceInDays'
import PoolModel from '../models/pool';
import PoolActor, { Pool } from '../actors/solarFlares';

type IProps = {
  pool: PoolModel,
}

export default function Component(props: IProps) {

  const [nft, setNft] = useState<NFTDetails | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);

  const fetch = useCallback(async (poolId: string) => {

    console.log('fetch', poolId)
    const actor = new PoolActor();
    await actor.createActor();
    console.log('createActor')

    const pools = await actor.getPool(poolId);
    console.log('pools', pools);
    if (pools && pools.length > 0) {
      const pool = pools[0] as Pool;
      setPool(pool);
      const nft = await getNFTDetail(pool.token.canisterId, 'EXT', parseInt(pool.token.index.toString()));
      setNft(nft);
    }

  }, [props.pool.pool_id]);

  useEffect(() => {

    fetch(props.pool.pool_id);

  }, [props.pool])


  // console.log('----')
  // console.log(pool.activeUntil)
  // console.log(new Date().getTime())


  const now = new Date();
  const activeUntil = props.pool.active_until;
  const name = `${props.pool.name} #${props.pool.index}`
  const status = now < activeUntil ? 'Active' : 'Finished';

  const sold = pool ? pool.tickets.reduce((prevValue, currentValue, currentIndex, array) => {
    return prevValue + parseInt(currentValue.count.toString())
  }, 0) : null;

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
    <Link href={`/pool/?id=${props.pool.pool_id}`}>
      <a>
        <img src={props.pool.url} alt={name} />

        <div className={styles.textContainer}>
          <p className={styles.name}>{name}</p>
          <div className={styles.mainTextContainer}>
            <p className={styles.price}>{(parseFloat(props.pool.price) / 100000000).toFixed(2)} ICP</p>
            {status == 'Active' &&
              <p className={`${styles.status} ${styles.active}`}>Active</p>
            }
          </div>
          <div className={styles.subTextContainer}>
            {sold != null &&
              <p className={styles.number}>{sold} / {props.pool.supply.toString()} sold</p>
            }
            <p className={styles.date}>{diff ? ('Ends in ' + diff) : 'Ended'}</p>
          </div>
        </div>

      </a>
    </Link>
  </div>
}