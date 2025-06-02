import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from '@/styles/components/common/LoadingState.module.css';

interface LoadingStateProps {
    message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
    return (
        <div className={styles.loading}>
            <Loader2 className={styles.spinner} size={40} />
            <p>{message}</p>
        </div>
    );
};

export default LoadingState; 