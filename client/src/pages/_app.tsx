import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import Header from '@/components/layout/Header';
import '@/styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <>
            <Header />
            <Component {...pageProps} />
            <Toaster 
                position="bottom-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                }}
            />
        </>
    );
}

export default MyApp;