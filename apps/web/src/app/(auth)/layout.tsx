import styles from "./auth.module.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>🐱</div>
        {children}
      </div>
    </div>
  );
}
