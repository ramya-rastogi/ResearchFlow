import React from 'react';

const steps = ['search', 'read', 'write', 'critic', 'revise', 'done'];

function PipelineTracker({ currentStep, wasRevised }) {
  const currentIndex = steps.indexOf(currentStep) === -1 ? 0 : steps.indexOf(currentStep);
  
  return (
    <div className="pipeline-tracker">
      {steps.map((s, idx) => {
        if (s === 'revise' && currentStep === 'done' && !wasRevised) return null;
        if (s === 'revise' && currentStep !== 'revise' && currentStep !== 'done') return null;
        
        let statusClass = '';
        if (idx < currentIndex) statusClass = 'done';
        if (idx === currentIndex && currentStep !== 'done') statusClass = 'active';
        if (s === 'done' && currentStep === 'done') statusClass = 'done';

        return (
          <div key={s} className={`step ${statusClass}`}>
            <div className="step-icon">{idx + 1}</div>
            <div className="step-label">{s}</div>
          </div>
        );
      })}
    </div>
  );
}

export default PipelineTracker;
