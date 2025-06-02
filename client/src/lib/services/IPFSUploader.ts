import { NFTStorage, File } from 'nft.storage';
import { NFTMetadata } from '../types';

export class IPFSUploader {
    private client: NFTStorage;
    private static instance: IPFSUploader;

    private constructor() {
        this.client = new NFTStorage({ token: process.env.NEXT_PUBLIC_NFT_STORAGE_KEY! });
    }

    static getInstance(): IPFSUploader {
        if (!this.instance) {
            this.instance = new IPFSUploader();
        }
        return this.instance;
    }

    async uploadCollection(
        nfts: Array<{ image: Blob; metadata: NFTMetadata }>,
        onProgress: (current: number, total: number, status: string) => void
    ): Promise<{ baseUri: string; metadataUri: string }> {
        try {
            // Upload images first
            onProgress(0, nfts.length * 2, 'Uploading images to IPFS...');
            const imageFiles = nfts.map((nft, index) => 
                new File([nft.image], `${index + 1}.png`, { type: 'image/png' })
            );
            const imagesCID = await this.client.storeDirectory(imageFiles);
            
            // Update metadata with correct IPFS URLs
            const updatedNFTs = nfts.map((nft, index) => ({
                ...nft,
                metadata: {
                    ...nft.metadata,
                    image: `ipfs://${imagesCID}/${index + 1}.png`
                }
            }));

            // Upload metadata
            onProgress(nfts.length, nfts.length * 2, 'Uploading metadata to IPFS...');
            const metadataFiles = updatedNFTs.map((nft, index) =>
                new File(
                    [JSON.stringify(nft.metadata, null, 2)],
                    `${index + 1}.json`,
                    { type: 'application/json' }
                )
            );
            const metadataCID = await this.client.storeDirectory(metadataFiles);

            return {
                baseUri: `ipfs://${imagesCID}/`,
                metadataUri: `ipfs://${metadataCID}/`
            };
        } catch (error) {
            console.error('IPFS upload error:', error);
            throw new Error('Failed to upload to IPFS');
        }
    }
} 