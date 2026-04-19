import styles from "./auth.module.css";
import { HomeIcon } from "../../components/ui/Icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}><HomeIcon size={48} /></div>
        {children}
      </div>
    </div>
  );
}
