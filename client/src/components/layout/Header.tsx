import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Ear } from 'lucide-react';
import styles from '@/styles/components/layout/Header.module.css';

const Header = () => {
    const router = useRouter();

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <Link href="/" className={styles.logo}>
                    <Ear size={32} />
                    <span>BeraLaunch</span>
                </Link>

                <nav className={styles.desktopNav}>
                    <Link 
                        href="/create/generate" 
                        className={`${styles.navLink} ${router.pathname === '/create/generate' ? styles.active : ''}`}
                    >
                        Create NFT
                    </Link>
                    <Link 
                        href="/collections" 
                        className={`${styles.navLink} ${router.pathname === '/collections' ? styles.active : ''}`}
                    >
                        My Collections
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;