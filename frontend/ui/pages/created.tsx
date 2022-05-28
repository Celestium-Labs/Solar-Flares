import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { Layout } from '../components/Layout'
import PoolsComponent from '../components/Pools';

const Home: NextPage = () => {

  return (
    <Layout>

      <Head>
        <title>Your pools - SOLAR FLARES</title>
        <meta name="description" content="When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor" />
        <link rel="icon" href="/favicon.ico" />

        <meta property="og:title" content={"Your pools - SOLAR FLARES"} />
        <meta property="og:type" content="website" />
        <meta property="og:description" content={'When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor'} />
        <meta property="og:url" content="https://jdq7a-qiaaa-aaaad-qcbia-cai.ic.fleek.co/ogp.jpg" />
        <meta property="og:image" content="https://jdq7a-qiaaa-aaaad-qcbia-cai.ic.fleek.co/ogp.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:title" content={'Your pools - SOLAR FLARES'} />
        <meta name="twitter:description" content={'When the sun fills up with helium, a solar flare shoots in a random direction, at one contributor'} />
        <meta name="twitter:image" content="https://jdq7a-qiaaa-aaaad-qcbia-cai.ic.fleek.co/ogp.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <main className={styles.container}>
        return <PoolsComponent />
      </main>

    </Layout>
  )
}

export default Home
