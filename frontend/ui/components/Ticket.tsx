import { useState, useEffect, useContext } from "react";
import styles from '../styles/Ticket.module.css'
import { Context } from "../services/context";
import Link from 'next/link'
import { Lottery } from '../actors/lottery';
import { getNFTDetail } from '../actors/dab';
import { Ticket } from '../declarations/lottery/lottery.did'
import LedgerActor from '../actors/ledger';
import LotteryActor from '../actors/lottery';
import { principalToAccountIdentifier, fromHexString, principalToAccountIdentifierFromSubAccountArray } from '../utils/ext'
import Loader from "./Loader";

type IProps = {
  lottery: Lottery,
  ticket: Ticket,
  mode: 'purchased' | 'unsettled' | 'expired',
  principal: string,
  reload: () => void,
}

export default function Component({ lottery, ticket, mode, principal, reload }: IProps) {

  const [refundMode, setRefundMode] = useState<'none' | 'now' | 'later'>('none');

  async function fetchTransaction() {
    const ledgerActor = new LedgerActor();
    const lotteryActor = new LotteryActor();

    await ledgerActor.createActor();

    const accountIdentifier = principalToAccountIdentifierFromSubAccountArray(lotteryActor.canisterId, ticket.payeeSubAccount);
    console.log('accountIdentifier', accountIdentifier)
    const balance = await ledgerActor.account_balance(accountIdentifier);

    console.log('balance', balance)

    if (balance && parseInt(balance.e8s.toString()) > 0) {
      console.log('lottery.status', lottery.status)
      const json = JSON.stringify(lottery.status);
      console.log('json', json)
      if (json.indexOf('InsufficientParticipants') > -1) {
        setRefundMode('now');
      } else if (mode != 'purchased' && json.indexOf('Selected') > -1) {
        setRefundMode('now');
      } else if (mode != 'purchased' && json.indexOf('Active') > -1) {
        setRefundMode('later');
      } else {
        setRefundMode('none');
      }
    } else {
      setRefundMode('none');
    }
  }

  useEffect(() => {

    fetchTransaction();

  }, [ticket]);

  return <div key={ticket.ticketId} className={`${styles.ticket} ${mode == 'expired' ? styles.ticketExpired : ''}`} onClick={async () => {
    if (refundMode == 'now') {

      const lotteryActor = new LotteryActor();
      await lotteryActor.createActor();

      Loader.show()
      const refund = await lotteryActor.refundICP(lottery.id, ticket.ticketId);
      console.log('refund', refund);
      if (refund && refund.length > 0) {
        console.log('json', (refund as any)[0])
        if ((refund as any)[0]['ok']) {
          alert('Refuneded successfully!');
        } else {

          let text = (refund as any)[0]['err'].message
          if (text) {
            alert(text);
          } else {
            alert('Unknown error has occurreded. Try again later.');
          }
        }
      } else {
        alert('You cannot refund the ticket.');
      }

      await fetchTransaction();

      Loader.dismiss()

      reload();

    }
  }}>
    <div className={styles.ticketLeft}>
      <p>{ticket.count.toString()} tickets</p>
      <p>{(parseFloat(ticket.count.toString()) / 100000000 * parseFloat(lottery.price.toString())).toFixed(2)} ICP</p>
    </div>
    <div>
      {mode == 'purchased' &&
        <p>Purchased</p>
      }
      {mode == 'unsettled' &&
        <p className={styles.ticketUnsettled}>Unsettled</p>
      }
      {mode == 'expired' &&
        <p>Expired</p>
      }
      {refundMode == 'now' &&
        <p className={styles.ticketRefundable}>refundable</p>
      }
      {refundMode == 'later' &&
        <p>Can refund later</p>
      }
    </div>

  </div>;
}