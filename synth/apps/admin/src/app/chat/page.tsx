import { ChatPanel } from '@/components/ChatPanel';
import styles from './page.module.css';

export default function ChatPage() {
  return (
    <div className={styles.page}>
      <h1>Agent Chat</h1>
      <p className={styles.description}>Talk to SYNTH, request analyses, and issue build directives.</p>
      <ChatPanel />
    </div>
  );
}
