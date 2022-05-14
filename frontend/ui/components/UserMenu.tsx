import { useState, useEffect, useContext } from "react";
import styles from '../styles/UserMenu.module.css'
import { Context } from "../services/context";
import Link from 'next/link'

type IProps = {
  close: () => void,
}

export default function Component({ close }: IProps) {

  const { principal, logout } = useContext(Context);

  return <div className={styles.background} onClick={() => {
    close();
  }}>

    <div className={styles.container}>
      <p className={styles.principal}>{principal}</p>

      <p className={styles.hosted}>
        <Link href="/created">
          <a>Pools you created</a>
        </Link>
      </p>

      <p className={styles.participated}>
        <Link href="/participated">
          <a>Pools you participated</a>
        </Link>
      </p>

      <p className={styles.logout} onClick={() => {
        logout();
        close();
      }}>
        disconnect
      </p>
    </div>

  </div>
}