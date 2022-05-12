import styles from '../styles/Dialog.module.css'

type IProps = {
  title: string,
  description: string,
  okTitle?: string,
  close: () => void,
  ok: () => void,
}

export default function Component({ title, description, okTitle, ok, close }: IProps) {

  return <div className={styles.background}>
    <div className={styles.container}>

      <p className={styles.title}>{title}</p>

      <p className={styles.description}>{description}</p>

      <div className={styles.buttons}>
        {okTitle &&
          <p className={styles.selectButton} onClick={() => {
            ok()
          }}>{okTitle}</p>
        }
        <p className={styles.cancelButton} onClick={() => {
          close()
        }}>Close</p>
      </div>
    </div>
  </div>

}