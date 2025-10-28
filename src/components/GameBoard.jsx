import React from 'react';

export default function GameBoard({ boardData, currentPlayer, playerId, onMove }) {
  // boardData: প্লেয়ারের টোকেন অবস্থানসমূহ
  // currentPlayer: কার টার্ন
  // playerId: এই প্লেয়ারের আইডি
  // onMove: টোকেন মুভ করার ফাংশন

  const handleTokenClick = (tokenIndex) => {
    if (currentPlayer !== playerId) {
      alert("এখন আপনার টার্ন নয়!");
      return;
    }
    // এখানে ডাইসের মান লাগবে। ডেমো হিসেবে ১ সেট করছি
    const diceValue = 1;
    onMove(tokenIndex, diceValue);
  };

  return (
    <div style={{ border: '2px solid black', padding: 20, maxWidth: 400, margin: 'auto' }}>
      <h3>Game Board</h3>
      <p>Current Player: {currentPlayer}</p>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {boardData && boardData.map((token, idx) => (
          <div
            key={idx}
            onClick={() => handleTokenClick(idx)}
            style={{
              width: 40,
              height: 40,
              backgroundColor: token === playerId ? 'green' : 'gray',
              margin: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: '50%',
              color: 'white',
              userSelect: 'none',
            }}
            title={`Token ${idx + 1}`}
          >
            {idx + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
