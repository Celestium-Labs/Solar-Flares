import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useContext, useState } from 'react'
import styles from '../styles/Rooms.module.css'
import { Layout } from '../components/Layout'
import { Context } from '../services/context';
import Loader from '../components/Loader';
import SwappActor from '../actors/lottery';
import { Room } from '../declarations/swapp/swapp.did';
import { Principal } from '@dfinity/principal';
import Link from 'next/link'

const Home: NextPage = () => {

  const { accountIdentifier, principal } = useContext(Context);
  const [rooms, setRooms] = useState<Room[]>([]);

  async function fetch() {
    const actor = new SwappActor();
    await actor.createActor();

    Loader.show();
    const rooms = await actor.fetchRooms();
    Loader.dismiss();
    if (rooms == null) {
      alert('Try again later.')
      return;
    }
    setRooms(rooms);

  }

  useEffect(() => {

    if (accountIdentifier) {
      fetch()
    }

  }, [accountIdentifier, principal]);

  const roomDoms = rooms.map(room => {

    const invitePrincipal = room.invitee.length > 0 ? room.invitee[0] as Principal : null;

    const owner = room.owner.toString() == principal?.toString() ? 'YOU' : room.owner.toString();
    const invitee = invitePrincipal && invitePrincipal.toString() == principal?.toString() ? 'YOU' : invitePrincipal ? invitePrincipal.toString() : '-'
    const date = new Date(Number(room.createdAt / BigInt(1000000)));

    return <div key={room.id} className={styles.room}>
      <table>
        <tbody>
          <tr>
            <th>ROOM ID</th>
            <td>{room.id}</td>
          </tr>
          <tr>
            <th>OWNER</th>
            <td>{owner}</td>
          </tr>
          <tr>
            <td>INVITEE</td>
            <th>{invitee}</th>
          </tr>
          <tr>
            <td>CREATED AT</td>
            <th>{date.toDateString()} {date.toLocaleTimeString()}</th>
          </tr>
        </tbody>
      </table>

      <Link href={`/room/?roomId=${room.id}`}>
        <a className={styles.button}>Open</a>
      </Link>

    </div>

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

        <h2>Your rooms</h2>

        {roomDoms}

      </main>

    </Layout>
  )
}

export default Home
