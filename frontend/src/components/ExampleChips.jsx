import React from 'react';

function ExampleChips({ onSelect }) {
  const chips = [
    'CRISPR clinical trials 2024', 
    'Impact of AI on software engineering', 
    'JWST recent exoplanet discoveries'
  ];

  return (
    <div className="chips">
      {chips.map(c => (
        <div key={c} className="chip" onClick={() => onSelect(c)}>
          {c}
        </div>
      ))}
    </div>
  );
}

export default ExampleChips;
