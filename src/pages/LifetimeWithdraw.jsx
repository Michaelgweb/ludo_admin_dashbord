import React, { useEffect, useState } from 'react';

function LifetimeWithdraw({ token }) {
  const [lifetimeWinning, setLifetimeWinning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("টোকেন পাওয়া যায়নি, লগইন করুন");
      setLoading(false);
      return;
    }

    fetch('/api/withdraw/lifetime', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,  // টোকেন ব্যবহার
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'লাইফটাইম উইনিং ফেচ করতে সমস্যা হয়েছে');
        }
        return res.json();
      })
      .then(data => {
        if (data && typeof data.total === 'number') {
          setLifetimeWinning(data.total);
        } else {
          throw new Error('অপ্রত্যাশিত ডাটা ফরম্যাট');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div>লোড হচ্ছে...</div>;
  if (error) return <div>ত্রুটি: {error}</div>;

  return (
    <div>
      <h2>লাইফটাইম উইনিং</h2>
      <p>৳ {lifetimeWinning.toFixed(2)}</p>
    </div>
  );
}

export default LifetimeWithdraw;
