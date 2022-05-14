import { useState, useEffect, useContext } from "react";
import { principalToAccountIdentifier } from "../utils/ext";
import styles from '../styles/Header.module.css'
import { Context } from "../services/context";
import Logo from './svg/logo';
import Link from 'next/link'
import UserMenu from './UserMenu';
import LoginMenu from './LoginMenu';

export default function Component() {

  const { accountIdentifier, login, logout, showLoginMenu, setShowLoginMenu } = useContext(Context);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return <header className={styles.container}>
    <h1>
      <Link href="/">
        <a><Logo /></a>
      </Link>
    </h1>

    <ul>
      {/* <li>
        <Link href="/#howitworks">
          <a>how it works</a>
        </Link>
      </li> */}
      <li>
        <Link href="/">
          <a>Explore</a>
        </Link>
      </li>
      {/* <li>
        <Link href="/#team">
          <a>Team</a>
        </Link>
      </li> */}
    </ul>

    <p className={styles.connectButton} onClick={async () => {

      if (accountIdentifier) {
        setShowUserMenu(true);
      } else {
        setShowLoginMenu(true)
      }
    }}>{accountIdentifier ? accountIdentifier : 'Connect'}</p>

    {showUserMenu &&
      <UserMenu close={() => {
        setShowUserMenu(false);
      }} />
    }

    {showLoginMenu &&
      <LoginMenu login={(wallet) => {
        login(wallet)
      }} close={() => {
        setShowLoginMenu(false);
      }} />
    }
  </header>
}