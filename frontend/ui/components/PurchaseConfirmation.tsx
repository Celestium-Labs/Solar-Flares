import { useState, useEffect, useContext } from "react";
import styles from '../styles/ListingConfirmation.module.css'
import { Context } from "../services/context";
import { NFTDetails } from '@psychedelic/dab-js'
import { getCachedNFTs } from '../actors/dab';
import { Pool, Ticket } from '../declarations/SolarFlares/SolarFlares.did'
import { Principal } from "@dfinity/principal";
import Loader from '../components/Loader';
import SolarFlaresActor from '../actors/solarFlares';
import LedgerActor, { TRANSFER_FEE } from '../actors/ledger';
import { principalToAccountIdentifier, fromHexString, principalToAccountIdentifierFromSubAccountArray } from '../utils/ext'

type IProps = {
  pool: Pool,
  nft: NFTDetails,
  principal: string,
  ticketNum: number,
  close: (reload: boolean) => void,
}

export default function Component({ pool, nft, ticketNum, principal, close }: IProps) {

  const icp = (parseFloat((BigInt(ticketNum) * pool.price).toString()) / 100000000).toFixed(2)

  return <div className={styles.background}>
    <div className={styles.container}>

      <p className={styles.title}>Confirm to participate</p>

      <p className={styles.description}>You will participate in the drip for {nft.name} #{nft.index.toString()}.
      </p>

      <ul>
        <li>Number: {ticketNum}</li>
        <li>PRICE: {icp} ICP</li>
        <li>Chance to win: {(ticketNum / parseFloat(pool.supply.toString()) * 100).toFixed(1)} %</li>
      </ul>

      <p className={styles.caution}>If all tickets are not purchased within the time frame, you can claim to get refunded on the pool page.</p>

      <div className={styles.buttons}>
        <p className={styles.selectButton} onClick={async () => {

          const id = pool.id;

          const totalICP = BigInt(ticketNum) * pool.price;

          const poolActor = new SolarFlaresActor();
          const ledgerActor = new LedgerActor();
          await poolActor.createActor();
          await ledgerActor.createActor();

          console.log('createActor')

          Loader.show('')
          const accountIdentifier = principalToAccountIdentifier(principal, null);
          console.log('accountIdentifier', accountIdentifier, fromHexString(accountIdentifier))
          const balance = await ledgerActor.account_balance(fromHexString(accountIdentifier))
          console.log('balance', balance)

          if (!balance || balance.e8s < totalICP + TRANSFER_FEE) {
            Loader.dismiss()
            alert('You don\'t have enough fund in your wallet.')
            return;
          }

          Loader.show(`Securing ${ticketNum > 1 ? '' : 'a'} ticket${ticketNum > 1 ? 's' : ''}.`)

          const lockResult = await poolActor.lock(id ?? '', ticketNum)
          console.log('lockResult', lockResult)

          console.log('activeUntil', pool.activeUntil)
          const lockError = (lockResult as any).err
          if (lockError) {
            Loader.dismiss();

            switch (JSON.stringify(lockError)) {
              case (JSON.stringify({ 'PoolNotFound': null })):
                alert('Unknown error has occurred. Try again later.')
                close(true);
                break;
              case (JSON.stringify({ 'CalledByOwner': null })):
                alert('You can\'t purchase a ticket because you are the host of this pool.')
                break;
              case (JSON.stringify({ 'Full': null })):
                alert('This drip has been sold out now.')
                close(true);
                break;
              case (JSON.stringify({ 'Ended': null })):
                alert('This pool has ended.')
                close(true);
                break;
            }
            return;
          }

          const ticket = (lockResult as any).ok

          Loader.show('Transferring ICP.')

          const payee = principalToAccountIdentifierFromSubAccountArray(poolActor.canisterId, ticket.ticket.payeeSubAccount);
          const transferResult = await ledgerActor.transfer(payee, totalICP);
          console.log('transferResult', transferResult, totalICP)

          const transferError = (transferResult as any).Err
          if (transferError) {
            Loader.dismiss();
            if (transferError.Err.InsufficientFunds) {
              alert('You don`t have enough fund in your wallet.')
              close(true);
            } else {
              alert('Unknown error has occured.')
              close(true);
            }
            return;
          }

          Loader.show('Transferring ticket(s).')

          const unlockResult = await poolActor.unlock(id ?? '', ticket.ticket.ticketId);
          console.log('unlockResult', unlockResult)

          const unlockError = (unlockResult as any).err
          if (unlockError) {
            Loader.dismiss();

            switch (JSON.stringify(unlockError)) {
              case (JSON.stringify({ 'PoolNotFound': null })):
                alert('Unknown error occurs. Try again later.')
                close(true);
                break;
              case (JSON.stringify({ 'NotLocked': null })):
                alert('Unknown error occurs. Try again later.')
                break;
              case (JSON.stringify({ 'Expired': null })):
                alert('The ticket is expired.')
                close(true);
                break;
              case (JSON.stringify({ 'Unpaied': null })):
                alert('You have to make a payment beforehand.')
                close(true);
                break;
            }
            return;
          }

          Loader.dismiss();
          close(true);

        }}>Participate</p>
        <p className={styles.cancelButton} onClick={() => {
          close(false);
        }}>Cancel</p>
      </div>
    </div>
  </div>

}