import { Game } from './components/Game';
import { MessageProvider } from './hooks/useMessageSystem';
import './App.css';

function App() {
  return (
    <MessageProvider>
      <Game />
    </MessageProvider>
  );
}

export default App;
