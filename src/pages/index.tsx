import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from '@/styles/pages/Home.module.css';

const HomePage = () => {
    return (
        <div className={styles.homePage}>
            <section className={`${styles.hero} ${styles.fadeIn}`}>
                <div className={styles.heroContent}>
                    <h1 className={styles.slideUp}>Create Your NFT Collection</h1>
                    <p className={styles.slideUp}>Generate unique NFTs with our easy-to-use layered art generator</p>
                    <div className={`${styles.heroButtons} ${styles.slideUp}`}>
                        <Link href="/create/generate" className={styles.primaryButton}>
                            Start Generating
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;