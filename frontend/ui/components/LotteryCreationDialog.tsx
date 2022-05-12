import { useState, useEffect, useContext } from "react";
import { principalToAccountIdentifier } from "../utils/ext";
import styles from '../styles/LotteryCreationDialog.module.css'
import { Context } from "../services/context";
import { NFTDetails } from '@psychedelic/dab-js'
import { getCachedNFTs } from '../actors/dab';
import Loader from "./Loader";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LotteryActor from '../actors/lottery';
import LedgerActor from "../actors/ledger";
import EXTNftActor from "../actors/nft/ext";

type IProps = {
  principal: string,
  close: () => void,
  resumeWithPreparedLottery: () => void,
  created: (lotteryId: string) => void,
}

const today = new Date()
const minDate = new Date(today)
minDate.setDate(minDate.getDate() + 3)
const maxDate = new Date(today)
maxDate.setDate(minDate.getDate() + 14)

export default function Component({ principal, created, close, resumeWithPreparedLottery }: IProps) {

  const [nfts, setNFTs] = useState<NFTDetails[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [selectedNFT, setSelectedNFT] = useState<NFTDetails | null>(null);

  const [price, setPrice] = useState<number | undefined>(0.1);
  const [units, setUnits] = useState<number | undefined>(30);
  const [activeUntil, setActiveUntil] = useState(new Date(minDate));

  useEffect(() => {
    if (loaded) { return }
    Loader.show('Fetching NFTs you own. This may take a few minutes.')
    getCachedNFTs(principal.toString(), false).then(nfts => {
      Loader.dismiss()
      setNFTs(nfts);
      setLoaded(true);
    })
  }, [loaded])

  function reload() {
    Loader.show('Reloading NFTs you own. This may take a few minutes.')
    getCachedNFTs(principal.toString(), true).then(nfts => {
      setNFTs(nfts);
      Loader.dismiss();
    })
  }

  const nftItems = nfts.map(nft => {
    return <div key={nft.id} className={styles.nft}>

      <img src={nft.url} alt={nft.name} />

      <div className={styles.nftMetadata}>
        <p className={styles.nftTitle}>{nft.collection} #{nft.index.toString()}</p>
        <p className={styles.nftId}>{nft.id}</p>
        <p className={styles.nftStandard}>{nft.standard}-standard</p>
      </div>

      <div className={styles.nftButtonContainer}>
        {nft.standard == 'EXT' &&
          <p className={styles.nftSelectButton} onClick={() => {
            setSelectedNFT(nft);
          }}>Select</p>
        }
      </div>
    </div>
  })

  return <div className={styles.background}>
    <div className={styles.container}>

      <div className={styles.topHeader}>
        <h3 className={styles.title}>Host a lottery</h3>
        <p className={styles.topClose} onClick={() => {
          close();
        }}>close</p>
      </div>
      {!selectedNFT &&
        <div>
          <div className={styles.header}>
            <p className={styles.subtitle}>Step 1 / 3. Select an NFT</p>
            <p className={styles.reload} onClick={() => {
              reload();
            }}>reload the list</p>
          </div>


          <p className={styles.description}>We support EXT-standard NFTs listed on <a href="https://dab.ooo/" target="_blank" rel="noreferrer">DAB</a> from psychedelic.
            Different formats will be supported soon.</p>

          {nftItems.length > 0 &&
            nftItems
          }

          {loaded && nftItems.length == 0 &&
            <p className={styles.noNFTFound}>No NFT found.</p>
          }
        </div>
      }


      {selectedNFT && !showConfirmation &&
        <div>

          <div className={styles.header}>
            <p className={styles.subtitle}>Step 2 / 3. Set the lottery settings</p>
          </div>

          <p className={styles.step2ItemTitle}>How many tickets do you want to issue?</p>

          <div className={styles.step2Item}>

            <input className={styles.input} type="number" min={1} max={100} value={units ?? ''} onChange={(e) => {

              if (e.target.value == '') {
                setUnits(undefined);
                return
              }

              console.log('units', e.target.value)
              try {
                const units = parseInt(e.target.value);
                setUnits(units);
              } catch {

              }

            }} /> ticket(s)
          </div>

          <div className={styles.step2Item}>
            <p className={styles.step2ItemTitle}>How much is a ticket price?</p>
            <input className={styles.input} type="number" min={0.01} max={100} step={0.01} value={price ?? ''} onChange={(e) => {

              if (e.target.value == '') {
                setPrice(undefined);
                return
              }

              try {
                const price = parseFloat(e.target.value);
                setPrice(price);
              } catch (e) {
                console.log(e)
              }

            }} /> ICP
          </div>

          <div className={styles.step2Item}>
            <p className={styles.step2ItemTitle}>After when will a winner be selected?</p>

            <div className={styles.datepickerContainer}>
              <DatePicker className={styles.datepicker} minDate={minDate} maxDate={maxDate} selected={activeUntil} onChange={(date) => setActiveUntil(date ?? new Date())} />
              <span>12:00AM UTC</span>
            </div>
          </div>

          <div className={styles.buttons}>
            <p className={`${styles.selectButton} ${!units || !price ? styles.disabledButton : ''} `} onClick={() => {
              setShowConfirmation(true);
            }}>List</p>
            <p className={styles.cancelButton} onClick={() => {
              setSelectedNFT(null)
            }}>Back</p>
          </div>

        </div>
      }


      {showConfirmation && selectedNFT && price && units &&

        <>

          <div className={styles.header}>
            <p className={styles.subtitle}>Step 3 / 3. Confirm</p>
          </div>

          <div key={selectedNFT.id} className={styles.nft}>
            <img src={selectedNFT.url} alt={selectedNFT.name} />

            <div className={styles.nftMetadata}>
              <p className={styles.nftTitle}>{selectedNFT.collection} #{selectedNFT.index.toString()}</p>
              <p className={styles.nftId}>{selectedNFT.id}</p>
              <p className={styles.nftStandard}>{selectedNFT.standard}-standard</p>
            </div>
          </div>

          <div>
            <ul className={styles.confitmationTable}>
              <li>Tickets: <span>{units}</span></li>
              <li>Price per one ticket: <span>{price} ICP</span></li>
              <li>A winner will be selected after <span>{activeUntil.toDateString()}</span></li>
            </ul>
 
            <p>You will raise {(price * units).toFixed(2)} ICP in total. We take 10% as a transaction fee.</p>

          </div>

          <p className={styles.smallDescription}>Your NFT will be transferred to our escrow account for a lottery.
            Your NFT will be transferred back to you when you cannot sell all the tickets.
            We take 10% of your earning as a transaction fee.
          </p>

          <div className={styles.buttons}>
            <p className={styles.selectButton} onClick={async () => {

              if (!selectedNFT) { return }

              const index = parseInt(selectedNFT.index.toString());

              const canisterId = 'rkp4c-7iaaa-aaaaa-aaaca-cai' //selectedNFT.canister
              const tokenIndex = 76 // 76~100 index
              console.log('tokenIndex', tokenIndex)

              const lotteryActor = new LotteryActor();
              const nftActor = new EXTNftActor(canisterId);

              await lotteryActor.createActor()
              await nftActor.createAgent()

              Loader.show('Preparing..');

              const priceBigInt = Math.floor(price * 100000000);
              const prepareResult = await lotteryActor.prepare(units, priceBigInt, activeUntil, canisterId, tokenIndex, 'EXT');
              console.log('prepareResult', prepareResult)

              if (prepareResult == null) {
                Loader.dismiss();
                alert('Unknown error occurs to preparing a lottery. Try again later.')
                return;
              }

              const prepareError = (prepareResult as any).err
              if (prepareError) {
                Loader.dismiss();

                switch (JSON.stringify(prepareError)) {
                  case (JSON.stringify({ 'NotOwned': null })):
                    alert('You don\'t own the token now.')
                    setShowConfirmation(false);
                    setSelectedNFT(null)
                    break;
                  case (JSON.stringify({ 'InvalidSupply': null }) || JSON.stringify({ 'InvalidPrice': null }) || JSON.stringify({ 'InvalidActiveUntil': null })):
                    alert('Invalid input values are given.')
                    setShowConfirmation(false);
                    break;
                  case (JSON.stringify({ 'AlreadyExists': null })):
                    alert('You are creating another lottery now.')
                    setShowConfirmation(false);
                    setSelectedNFT(null)
                    resumeWithPreparedLottery();
                    break;
                }
                return;
              }

              Loader.show('Transferring..');

              const res = await nftActor.transfer(tokenIndex, principal, lotteryActor.canisterId);
              console.log('res', res)

              Loader.show('Creating..');

              const createResult = await lotteryActor.create();
              console.log('createResult', createResult)

              const createError = (createResult as any).err
              if (createError) {
                Loader.dismiss();
                switch (JSON.stringify(createError)) {
                  case (JSON.stringify({ 'NotTransferred': null })):
                    alert('You need to transfer the nft first.')
                    break;
                  case (JSON.stringify({ 'NotExists': null })):
                    alert('Unknown error occurs when creating a lottery. Try again later.')
                    close()
                    break;
                }
                return;
              }

              Loader.dismiss();

              if ((prepareResult as any).ok) {
                created((prepareResult as any).ok as string);
              }

            }}>Submit</p>
            <p className={styles.cancelButton} onClick={() => {
              close()
            }}>Cancel</p>
          </div>
        </>
      }

    </div>
  </div>
}