import React from 'react';

function SourceBadge({ tier }) {
  return (
    <span className={`badge badge-${tier}`}>
      {tier.toUpperCase()}
    </span>
  );
}

export default SourceBadge;
