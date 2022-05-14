import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useContext, useCallback, useState } from 'react'
import styles from '../styles/Home.module.css'
import Dfinity from '../components/svg/dfinity';
import Twitter from '../components/svg/twitter';
import { Layout } from '../components/Layout'
import { Context } from '../services/context';
import { useRouter } from 'next/router'
import Loader from '../components/Loader';
import PoolActor, { Pool } from '../actors/solarFlares';
import PoolCreationDialog from '../components/PoolCreationDialog';
import PoolComponent from '../components/Pool';
import { Principal } from '@dfinity/principal';

const Home: NextPage = () => {

  const { login, accountIdentifier, principal, showLoginMenu, setShowLoginMenu } = useContext(Context);
  const [initialized, setInitialized] = useState(false);

  const [showPoolDialog, setShowPoolDialog] = useState(false);
  const [pools, setPools] = useState<Pool[]>([]);
  const [creators, setCreators] = useState<Principal[]>([]);

  const router = useRouter()

  async function fetch(to: number | null) {

    Loader.show();
    const actor = new PoolActor();
    await actor.createActor();


    if (to && to > 0) {
      const newPools = await actor.getPools(Math.max(0, to - 12), to);
      if (newPools) {
        setPools(arr => [...newPools.reverse(), ...arr])
      }
    } else {
      const countBigInt = await actor.getTotalCount() ?? BigInt(0);
      const count = parseInt(countBigInt.toString());
      const newPools = await actor.getPools(Math.max(0, count - 12), count);
      console.log('newPools', newPools)
      if (newPools) {
        setPools(arr => [...newPools.reverse(), ...arr])
      }
    }

    Loader.dismiss();
  }

  async function getCreators() {

    const actor = new PoolActor();
    await actor.createActor();
    const creators = await actor.getCreators();
    if (creators != null) {
      setCreators(creators);
    }
  }

  useEffect(() => {

    if (initialized) { return }
    setInitialized(true);
    fetch(null);
    getCreators();

  }, []);

  const startDrip = useCallback(async () => {
    if (accountIdentifier == null) {
      setShowLoginMenu(true)
      return
    }

    const actor = new PoolActor();
    await actor.createActor()

    Loader.show();

    const preparation = await actor.getPreparation()
    console.log('preparation', preparation)
    Loader.dismiss();

    if (preparation && preparation.length > 0) {

      // prepare
      console.log(preparation)


    } else {
      // create
      setShowPoolDialog(true);
    }


  }, [accountIdentifier]);

  let isCreator = false;
  creators.forEach(c => {
    if (c.toString() == principal) {
      isCreator = true;
    }
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

        <div className={styles.main}>
          {/* <h2>solar flares</h2> */}
          <h3>When the sun fills up with helium <br /> a solar flare shoots in a random direction, at one contributor</h3>
          <Dfinity />
          {isCreator &&
            <p onClick={() => {
              startDrip();
            }} className={styles.createButton}>Create a pool!</p>
          }
        </div>

        <section className={styles.section} id="drips">

          <div className={styles.poolsContainer}>
            {pools.map(pool => {
              return <PoolComponent key={pool.id} pool={pool} />
            })}
          </div>
        </section>

        <section className={styles.section} id="team">
          <h3>Team</h3>

          <div className={styles.members}>
            <div className={styles.member}>
              <img src="/team/sencho.jpg" alt="sencho" />
              <div className={styles.memberInfo}>
                <h4>Sencho</h4>
                {/* <p>Developer, Designer, Generative artist</p> */}
                <a href="https://twitter.com/duelaliens" target="_blank" rel="noreferrer"><Twitter /></a>
              </div>
            </div>

            <div className={styles.member}>
              <img src="/team/sharikon.jpg" alt="sharikon" />
              <div className={styles.memberInfo}>
                <h4>Sharikon</h4>
                {/* <p>xxxxxxxxxxxx</p> */}
                <a href="https://twitter.com/Sharikon1" target="_blank" rel="noreferrer"><Twitter /></a>
              </div>
            </div>

            <div className={styles.member}>
              <img src="/team/sirloui.jpg" alt="sirloui" />
              <div className={styles.memberInfo}>
                <h4>sirloui</h4>
                {/* <p>xxxxxxxxxxxx</p> */}
                <a href="https://twitter.com/MajesticLoui" target="_blank" rel="noreferrer"><Twitter /></a>
              </div>
            </div>

            <div className={styles.member}>
              <img src="/team/pwoseidon.jpg" alt="Pwoseidon" />
              <div className={styles.memberInfo}>
                <h4>Pwoseidon</h4>
                {/* <p>xxxxxxxxxxxx</p> */}
                <a href="https://twitter.com/Pwoseidonn" target="_blank" rel="noreferrer"><Twitter /></a>
              </div>
            </div>

          </div>

        </section>

      </main>


      {principal && showPoolDialog &&
        <PoolCreationDialog principal={principal} close={() => {
          setShowPoolDialog(false)
        }} created={(poolId) => {
          setShowPoolDialog(false)

          router.push(`/pool/?id=${poolId}`);

        }} resumeWithPreparedPool={() => {

        }} />
      }

    </Layout>
  )
}

export default Home
