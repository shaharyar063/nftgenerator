import React from 'react';
import ProgressOverlay from '../common/ProgressOverlay';

interface GenerationProgressProps {
    current: number;
    total: number;
    status: string;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
    current,
    total,
    status
}) => {
    return (
        <ProgressOverlay 
            current={current}
            total={total}
            status={status}
        />
    );
};