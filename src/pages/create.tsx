import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from '@/styles/pages/Create.module.css';

const CreatePage = () => {
    return (
        <div className={styles.createPage}>
            <div className={styles.header}>
                <h1>Create NFT Collection</h1>
                <p>Choose your preferred method to create your NFT collection</p>
            </div>
            
            <div className={styles.optionsGrid}>
                <Link href="/create/generate" className={styles.optionCard}>
                    <div className={styles.cardIcon}>
                        <ArrowRight size={32} />
                    </div>
                    <h2>Generate Collection</h2>
                    <p>Create a collection by uploading layer assets and generating unique combinations</p>
                </Link>
            </div>
        </div>
    );
};

export default CreatePage;