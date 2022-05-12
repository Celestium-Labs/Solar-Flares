import { useState, useEffect, useContext } from "react";
import { principalToAccountIdentifier } from "../utils/ext";
import styles from '../styles/NFTList.module.css'
import { Context } from "../services/context";
import { NFTDetails } from '@psychedelic/dab-js'
import { getCachedNFTs } from '../actors/dab';
import ListingConfirmation from './ListingConfirmation';
import Loader from "./Loader";

type IProps = {
  principal: string,
  close: () => void,
  select: (nft: NFTDetails) => void,
}

export default function Component({ principal, select, close }: IProps) {

  const [nfts, setNFTs] = useState<NFTDetails[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTDetails | null>(null);

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
          }}>List</p>
        }
      </div>
    </div>
  })

  return <div className={styles.background}>
    <div className={styles.container}>

      <div className={styles.header}>
        <p className={styles.title}>Your NFTs</p>
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

      <p className={styles.cancelButton} onClick={() => {
        close()
      }}>Close</p>

    </div>

    {selectedNFT &&
      <ListingConfirmation nft={selectedNFT} select={(nft) => {
        select(nft);
      }} close={() => {
        setSelectedNFT(null);
      }} />
    }
  </div>
}