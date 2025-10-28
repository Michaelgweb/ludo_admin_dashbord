import React, { useState } from 'react';

export default function DiceButton({ onRoll }) {
  const [diceValue, setDiceValue] = useState(null);

  const rollDice = () => {
    const value = Math.floor(Math.random() * 6) + 1;
    setDiceValue(value);
    onRoll(value);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 20 }}>
      <button
        onClick={rollDice}
        style={{
          padding: '10px 20px',
          backgroundColor: '#f59e0b',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: 16,
        }}
      >
        Roll Dice
      </button>
      {diceValue !== null && (
        <p style={{ marginTop: 10, fontSize: 18 }}>Dice Value: {diceValue}</p>
      )}
    </div>
  );
}
