import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => (
  <div className="bk-steps" role="progressbar" aria-valuenow={currentStep} aria-valuemax={totalSteps}>
    {Array.from({ length: totalSteps }, (_, i) => {
      const step = i + 1;
      let className = 'bk-steps__dot';
      if (step === currentStep) className += ' bk-steps__dot--active';
      else if (step < currentStep) className += ' bk-steps__dot--completed';
      return <div key={step} className={className} />;
    })}
  </div>
);
