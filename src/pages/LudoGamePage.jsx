// 📁 File: src/pages/LudoGamePage.jsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import stompClient from '../socket/socket';
import GameBoard from '../components/GameBoard';
import DiceButton from '../components/DiceButton';

const LudoGamePage = () => {
  const { gameId } = useParams();
  const [playerId] = useState(0); // Hardcoded: should be dynamic/user-mapped
  const [boardState, setBoardState] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    stompClient.onConnect = () => {
      console.log('WebSocket connected ✅');
      setConnected(true);

      stompClient.subscribe(`/topic/game/${gameId}`, (msg) => {
        const data = JSON.parse(msg.body);
        setBoardState(data);
      });
    };

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, [gameId]);

  const sendMove = (tokenIndex, diceValue) => {
    const moveRequest = {
      gameId: parseInt(gameId),
      playerId,
      tokenIndex,
      diceValue,
    };

    stompClient.publish({
      destination: '/app/game/move',
      body: JSON.stringify(moveRequest),
    });
  };

  const handleLeave = () => {
    stompClient.publish({
      destination: '/app/game/leave',
      body: JSON.stringify({ gameId: parseInt(gameId), playerId }),
    });
  };

  if (!connected) return <p>Connecting to game...</p>;
  if (!boardState) return <p>Waiting for board state...</p>;

  return (
    <div>
      <h2 style={{ textAlign: 'center' }}>Game ID: {gameId}</h2>
      <GameBoard boardData={boardState.playerTokens} currentPlayer={boardState.currentPlayer} playerId={playerId} onMove={sendMove} />
      <DiceButton onRoll={(dice) => sendMove(0, dice)} />
      <button onClick={handleLeave} style={styles.leaveBtn}>Leave Game</button>
      {boardState.gameOver && <p style={styles.winMsg}>Game Over!</p>}
    </div>
  );
};

const styles = {
  leaveBtn: {
    marginTop: '20px',
    background: '#f87171',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  winMsg: {
    marginTop: '20px',
    color: 'green',
    fontWeight: 'bold',
  },
};

export default LudoBoard;