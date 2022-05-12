import { useState, useEffect, useContext } from "react";
import { principalToAccountIdentifier } from "../utils/ext";
import styles from '../styles/RoomSwapItem.module.css'
import { Context } from "../services/context";
import { NFTDetails } from '@psychedelic/dab-js'
import LedgerActor from '../actors/ledger';
import SwappActor from '../actors/swapp';
import NFTList from './NFTList';
import Dialog from './Dialog';
import Loader from "./Loader";
import { fromHexString } from '../utils/ext';
import EXTNFTActor from '../actors/nft/ext';

type IProps = {
  isOwner: boolean,
  whoami: 'owner' | 'invitee' | 'someone',
  principal: string | null,
  nft: NFTDetails | null,
  status: 'unlisted' | 'listed' | 'willAgree' | 'unowned' | 'agreed' | 'swapped' | 'unapproved'
  selectNFT: (nft: NFTDetails) => void,
  updateStatus: () => void,
  roomId: string,
}

export default function Component({ isOwner, whoami, nft, principal, status, selectNFT, roomId, updateStatus }: IProps) {

  const { login, accountIdentifier } = useContext(Context);

  const [showNFTs, setShowNFTs] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [agreeDialogMode, setAgreeDialogMode] = useState<'none' | 'agree' | 'transfer&agree'>('none');

  // console.log(nft?.name)
  return <div className={styles.swapItem}>
    <h2 className={styles.swapItemTitle}>{isOwner ? "Room Owner" : "Invitee"}</h2>
    <p className={styles.swapItemPersonId}>{principal ? (principal.slice(0, 30) + '...') : 'not joined yet'}</p>

    {nft &&
      <>
        <div className={styles.imageBox}>
          <img src={nft.url} alt={nft.name} />
        </div>
        <p className={styles.nftTitle}>{nft.name} #{nft.index.toString()}</p>
      </>
    }


    {!nft &&
      <div className={styles.imageBox}>
        <p>NO NFT LISTED YET</p>
      </div>
    }

    {(isOwner && whoami == 'owner' || !isOwner && whoami == 'invitee') && status == 'unlisted' &&
      <p className={styles.swapButton} onClick={async () => {
        
        const canisterId = 'p5jg7-6aaaa-aaaah-qcolq-cai'
        const nftActor = new EXTNFTActor(canisterId);
        await nftActor.createAgent();

        console.log('lock to', principal)

        const index = 1641 - 1;
    
        const list = await nftActor.list(index)
        console.log('listResult', list)

        const details = await nftActor.details(index)
        console.log('detailsResult', details)
        console.log('detailsResult1', (details as any).ok[1])

        console.log('price', ((details as any).ok as any)[1][0].price)
        console.log('seller', ((details as any).ok as any)[1][0].seller.toString())

        const price = ((details as any).ok as any)[1][0].price
        const lockResult = await nftActor.lock(index, price, principal ?? '')
        console.log('lockResult', lockResult)

        const settleResult = await nftActor.settle(index)
        console.log('settleResult', settleResult)

        // production
        // setShowNFTs(true)

        // for development (to select an empty nft)
        // selectNFT({} as NFTDetails);
      }}>Select NFT</p>
    }
    {!(isOwner && whoami == 'owner' || !isOwner && whoami == 'invitee') && status == 'unlisted' && 
      <p className={styles.nftCaution}>waiting to be listed</p>
    }
    {!isOwner && whoami == 'someone' && status == 'unlisted' && !isOwner && !principal &&
      <p className={styles.swapButton} onClick={() => {
        setShowJoin(true)
      }}>Join room</p>
    }


    {(!isOwner && whoami == 'owner' || isOwner && whoami == 'invitee') && status == 'listed' &&
      <p className={styles.nftCaution}>{"Waiting for the other person's NFT listed"}</p>
    }

    {(isOwner && whoami == 'owner' || !isOwner && whoami == 'invitee') && status == 'willAgree' &&
      <p className={`${styles.swapButton}`} onClick={async () => {

        const ledger = new LedgerActor()
        const swapp = new SwappActor()
        await ledger.createActor();
        await swapp.createActor();

        Loader.show('Confirming your account status. This may take half a minute.');

        const id = await swapp.getAccountIdentifierToTransfer(roomId);

        if (!id) {
          Loader.dismiss();
          alert('Try again later.')
          return
        }

        const transferred = await ledger.has_transferred_icp(id);

        Loader.dismiss();
        if (transferred == null) {
          alert('Try again later.')
          return
        } else if (transferred == true) {
          setAgreeDialogMode('agree')
        } else {
          setAgreeDialogMode('transfer&agree')
        }

      }}>Agree To swap</p>
    }
    {(isOwner && whoami != 'owner' || !isOwner && whoami != 'invitee') && status == 'willAgree' &&
      <p className={styles.nftCaution}>Not agreeed yet</p>
    }

    {status == 'unowned' &&
      <p className={styles.nftCaution}>{`The ${isOwner ? 'owner' : 'invitee'} doesn't own the NFT.`}</p>
    }

    {status == 'agreed' &&
      <p className={styles.nftStrongCaution}>Agreed to swap!</p>
    }

    {(isOwner && whoami == 'owner' || !isOwner && whoami == 'invitee') && status == 'unapproved' &&
      <p className={`${styles.swapButton}`} onClick={async () => {

        if (!nft) {
          alert('Unknown error');
          return;
        }

        Loader.show('Permitting us to swap the selected NFT.')
        const nftActor = new EXTNFTActor(nft.canister);
        await nftActor.createAgent();
    
        const approved = await nftActor.approveSwapp(parseInt(nft.index + ''));
        console.log('approved', approved)
        updateStatus();

      }}>Permit to swap</p>
    }
    {(isOwner && whoami != 'owner' || !isOwner && whoami != 'invitee') && status == 'unapproved' &&
      <p className={styles.nftCaution}>Swapp needs permission to swap!</p>
    }

    {showNFTs && principal &&
      <NFTList principal={principal} close={() => {
        setShowNFTs(false);
      }} select={(nft) => {
        selectNFT(nft);
        setShowNFTs(false);
      }} />
    }

    {showJoin &&
      <Dialog title={'Join this room'}
        description={"Join this room to trade your NFT with the owner."}
        okTitle={"Join"}
        ok={async () => {
          // join

          Loader.show('Joining the room. This may take a few minutes.');
          if (await login('plug')) { // TODO

            Loader.show('Joining the room. This may take a few minutes.');

            const swapp = new SwappActor()
            await swapp.createActor();

            const joinResult = await swapp.join(roomId)
            if (!joinResult) {
              alert('Try again later.')
              return
            }

            const res = joinResult as any;

            console.log('res!', joinResult)

            if (res.ok) {
              console.log('setShowJoin')
              setShowJoin(false);
              console.log('after setShowJoin')
              updateStatus();
            } else {
              Loader.dismiss();
              if (res.err.kind == { 'AlreadyJoined': null }) {
                setShowJoin(false);
                updateStatus();
              } else {
                Loader.dismiss();
                alert(res.err.message);
              }
            }

          } else {
            Loader.dismiss();
            alert('You need to login with Plug wallet.')
          };

        }}
        close={() => {
          setShowJoin(false);
        }} />
    }

    {agreeDialogMode != 'none' &&
      <Dialog title={'Agree to swap'}
        description={`
          Are you sure to swap? Once both persons agree to swap, our canister automatically starts to swap.
          ${agreeDialogMode == 'transfer&agree' ? 'We charge 0.05 ICP for each as a transaction fee. ' : ''}
        `}
        okTitle={`Agree`}
        ok={async () => {

          const ledger = new LedgerActor()
          const swapp = new SwappActor()
          await ledger.createActor();
          await swapp.createActor();

          Loader.show('Checking if you have already been charged the transaction fee.');
          // check balance if the wallet has the transaction fee
          const id = await swapp.getAccountIdentifierToTransfer(roomId);

          if (!id) {
            Loader.dismiss();
            alert('Try again later.')
            return
          }

          const transferred = await ledger.has_transferred_icp(id);
          console.log('transferred', transferred)
          if (transferred == null) {
            Loader.dismiss();
            alert('Try again later.')
            return
          } else if (transferred == false) {

            Loader.show('Charging the transaction fee.');

            const transferResult = await ledger.transfer_transactipn_fee(id);
            console.log('transferResult', transferResult)

            if (transferResult == null) {
              Loader.dismiss();
              alert('Try again later.')
              return
            }

            const res = transferResult as any;

            if (res.Err) {
              Loader.dismiss();
              alert(res.Err.message);
              return
            }

          }

          // Agree
          Loader.show('Start swapping. This may take a few minutes.');
          const swapResult = await swapp.swap(roomId);
          console.log('swapResult', swapResult)

          if (!swapResult) {
            alert('Try again later.')
            return
          }

          const res = swapResult as any;

          console.log('fres!', res)
          Loader.dismiss();

          if (res.ok) {
            setAgreeDialogMode('none');
            updateStatus();
          } else {
            Loader.dismiss();
            if (JSON.stringify(res.err.kind) == JSON.stringify({ 'NotAgreed': null })) {
              setAgreeDialogMode('none');
              updateStatus();
            } else {
              alert(res.err.message);
            }
          }

        }}
        close={() => {
          setAgreeDialogMode('none');
        }} />
    }

  </div>
}