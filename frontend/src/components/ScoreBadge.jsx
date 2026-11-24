import React from 'react';

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  const isHigh = score >= 8;
  const badgeClass = isHigh ? 'badge-high' : 'badge-low';
  
  return (
    <span className={`badge ${badgeClass}`}>
      Score: {score}/10
    </span>
  );
}

export default ScoreBadge;
