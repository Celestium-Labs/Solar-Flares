import { useState, useEffect, useContext } from "react";
import styles from '../styles/Ticket.module.css'
import { Context } from "../services/context";
import Link from 'next/link'
import { Lottery } from '../actors/lottery';
import { getNFTDetail } from '../actors/dab';
import { Ticket } from '../declarations/lottery/lottery.did'

type IProps = {
  lottery: Lottery,
  ticket: Ticket,
  mode: 'purchased' | 'unsettled' | 'expired',
}

export default function Component({ lottery, ticket, mode }: IProps) {

  // console.log('----')
  // console.log(lottery.activeUntil)
  // console.log(new Date().getTime())

  return <div key={ticket.ticketId} className={`${styles.ticket} ${mode == 'expired' ? styles.ticketExpired : ''}`}>
    <div className={styles.ticketLeft}>
      <p>{ticket.count.toString()} tickets</p>
      <p>{(parseFloat(ticket.count.toString()) / 100000000 * parseFloat(lottery.price.toString())).toFixed(2)} ICP</p>
    </div>
    {mode == 'purchased' &&
      <p>Purchased</p>
    }
    {mode == 'unsettled' &&
      <p className={styles.ticketUnsettled}>Unsettled</p>
    }
    {mode == 'expired' &&
      <p>Expired</p>
    }
  </div>;
}