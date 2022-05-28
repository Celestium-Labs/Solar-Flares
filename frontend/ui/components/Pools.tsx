import type { NextPage } from 'next'
import { useEffect, useContext, useState } from 'react'
import styles from '../styles/Home.module.css'
import { Layout } from '../components/Layout'
import { Context } from '../services/context';
import Loader from '../components/Loader';
import PoolActor, { Pool } from '../actors/solarFlares';
import PoolComponent from '../components/Pool';


const Home = () => {

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
    return <PoolComponent key={pool.id} pool={pool} />
  })

  return <div>
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
  </div>
}

export default Home
