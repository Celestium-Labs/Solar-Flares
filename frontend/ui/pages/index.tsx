import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useContext, useCallback, useState } from 'react'
import styles from '../styles/Home.module.css'
import Dfinity from '../components/svg/dfinity';
import Step1 from '../components/svg/step1';
import Step2 from '../components/svg/step2';
import Step3 from '../components/svg/step3';
import Step4 from '../components/svg/step4';
import Twitter from '../components/svg/twitter';
import { Layout } from '../components/Layout'
import { Context } from '../services/context';
import { useRouter } from 'next/router'
import Loader from '../components/Loader';
import LotteryActor, { Lottery } from '../actors/lottery';
import LotteryCreationDialog from '../components/LotteryCreationDialog';
import LotteryComponent from '../components/Lottery';

const Home: NextPage = () => {

  const { login, accountIdentifier, principal } = useContext(Context);
  const [initialized, setInitialized] = useState(false);

  const [showLotteryDialog, setShowLotteryDialog] = useState(false);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);

  const router = useRouter()

  async function fetch(to: number | null) {

    Loader.show();
    const actor = new LotteryActor();
    await actor.createActor();

    if (to && to > 0) {
      const newLotteries = await actor.getLotteries(Math.max(0, to - 12), to);
      if (newLotteries) {
        setLotteries(arr => [...arr, ...newLotteries])
      }

    } else {
      const countBigInt = await actor.getTotalCount() ?? BigInt(0);
      const count = parseInt(countBigInt.toString());
      const newLotteries = await actor.getLotteries(Math.max(0, count - 12), count);
      console.log('newLotteries', newLotteries)
      if (newLotteries) {
        setLotteries(arr => [...arr, ...newLotteries])
      }
    }
    Loader.dismiss();
  }

  useEffect(() => {

    if (initialized) { return }

    setInitialized(true);
    fetch(null);

  }, [initialized]);

  const createRoom = useCallback(async () => {
    if (accountIdentifier == null) {
      alert('You need to connect your wallet first.')
      return
    }

    const actor = new LotteryActor();
    await actor.createActor()

    Loader.show('Fetching data.');

    const preparation = await actor.getPreparation()
    console.log('preparation', preparation)
    Loader.dismiss();

    if (preparation && preparation.length > 0) {
      
      // prepare
      console.log(preparation)
    

    } else {
      // create
      setShowLotteryDialog(true);
    }


  }, [accountIdentifier]);

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

        <div className={styles.main}>
          <h2>Swap your NFTs safely on IC</h2>
          <Dfinity />
          <p onClick={() => {
            createRoom();
          }} className={styles.createButton}>Create a lottery</p>
        </div>

        <div className={styles.lotteriesContainer}>
          {lotteries.map(lottery => {
            return <LotteryComponent key={lottery.id} lottery={lottery} />
          })}
        </div>

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


      {principal && showLotteryDialog &&
        <LotteryCreationDialog principal={principal} close={() => {
          setShowLotteryDialog(false)
        }} created={(lotteryId) => {
          
        }} resumeWithPreparedLottery={() => {

        }} />
      }

    </Layout>
  )
}

export default Home