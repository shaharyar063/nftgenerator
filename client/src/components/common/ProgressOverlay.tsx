import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from '@/styles/components/common/ProgressOverlay.module.css';

interface ProgressOverlayProps {
    current: number;
    total: number;
    status: string;
}

const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ current, total, status }) => {
    const progress = Math.round((current / total) * 100);

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <Loader2 className={styles.spinner} size={48} />
                <h3>{status}</h3>
                <div className={styles.progressBar}>
                    <div 
                        className={styles.progressFill} 
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className={styles.progressText}>
                    {current} / {total} ({progress}%)
                </p>
            </div>
        </div>
    );
};

export default ProgressOverlay; 