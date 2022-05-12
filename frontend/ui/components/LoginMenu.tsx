import { useState, useEffect, useContext } from "react";
import styles from '../styles/LoginMenu.module.css'
import { Context } from "../services/context";
import Link from 'next/link'

type IProps = {
  login: (wallet: 'plug' | 'stoic') => void,
  close: () => void,
}

export default function Component({ login, close }: IProps) {

  return <div className={styles.background} onClick={() => {
    close();
  }}>

    <div className={styles.container}>
      <p className={styles.text}>Connect your wallet</p>

      <p className={`${styles.wallet} ${styles.walletTop}`} onClick={() => login('plug')}>
        <img src="/plug.png" alt="Plug" />
        <span>Plug</span>
      </p>

      <p className={styles.wallet} onClick={() => login('stoic')}>
        <img src="/stoic.png" alt="Stoic" />
        <span>Stoic</span>
      </p>
    </div>

  </div>
}