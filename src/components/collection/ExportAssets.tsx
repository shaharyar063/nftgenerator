import React, { useState, useCallback } from 'react';
import { 
    Download, 
    Archive, 
    FileJson, 
    Image as ImageIcon, 
    CheckCircle,
    AlertCircle,
    Upload,
    Link as LinkIcon,
    ArrowLeft
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { IPFSUploader } from '@/lib/services/IPFSUploader';
import styles from '@/styles/components/collection/ExportAssets.module.css';
import { NFTMetadata } from '@/lib/types';

interface ExportAssetsProps {
    generatedAssets: Array<{
        id: number;
        image: string | Blob;
        metadata: {
            name: string;
            description: string;
            image: string;
            attributes: Array<{
                trait_type: string;
                value: string;
                rarity: number;
            }>;
            symbol?: string;
            creator?: string;
            royalties?: number;
            compiler?: string;
        };
    }>;
    onBack: () => void;
    onComplete: () => void;
    collectionConfig?: any; // Add this for future compatibility
    hideNavigation?: boolean;
}

const IPFSLinks: React.FC<{ cid: string }> = ({ cid }) => (
    <div className={styles.ipfsLinks}>
        <div className={styles.ipfsLink}>
            <span>IPFS Gateway:</span>
            <a 
                href={`https://nftstorage.link/ipfs/${cid}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <LinkIcon size={16} />
                View on IPFS Gateway
            </a>
        </div>
        <div className={styles.ipfsLink}>
            <span>IPFS URI:</span>
            <code>ipfs://{cid}</code>
        </div>
    </div>
);

const ExportAssets: React.FC<ExportAssetsProps> = ({
    generatedAssets,
    onBack,
    onComplete,
    collectionConfig,
    hideNavigation = false
}) => {
    const [exportFormat, setExportFormat] = useState<'zip' | 'ipfs'>('zip');
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<{
        status: 'idle' | 'processing' | 'success' | 'error';
        message?: string;
        progress?: number;
        ipfsHash?: string;
    }>({ status: 'idle' });

    const handleExportZip = async () => {
        try {
            setExportStatus({
                status: 'processing',
                message: 'Creating ZIP file...',
                progress: 0,
            });

            const zip = new JSZip();
            const imagesFolder = zip.folder('images');
            const metadataFolder = zip.folder('metadata');
            
            if (!imagesFolder || !metadataFolder) {
                throw new Error('Failed to create folders in ZIP file');
            }
            
            // Create collection metadata
            const collectionMetadata = {
                name: "NFT Collection",
                description: "Generated NFT Collection",
                totalSupply: generatedAssets.length,
                items: generatedAssets.map((asset, index) => ({
                    id: asset.id,
                    name: asset.metadata?.name || `NFT #${index + 1}`,
                    ...(asset.metadata || {})
                }))
            };
            
            metadataFolder.file('collection.json', JSON.stringify(collectionMetadata, null, 2));
            
            // Process in chunks to avoid call stack issues
            const chunkSize = 10;
            const totalAssets = generatedAssets.length;
            
            for (let i = 0; i < totalAssets; i += chunkSize) {
                const chunk = generatedAssets.slice(i, i + chunkSize);
                
                // Process each asset in the chunk
                for (let j = 0; j < chunk.length; j++) {
                    const asset = chunk[j];
                    const assetIndex = i + j;
                    
                    try {
                        // Use clean file names with proper extensions for maximum compatibility
                        const metadataFileName = `${asset.id}.json`;
                        let imageFileName = `${asset.id}`;
                        let imageBlob: Blob | null = null;
                        
                        // Handle different image types
                        if (typeof asset.image === 'string') {
                            // Handle DataURL
                            if (asset.image.startsWith('data:')) {
                                const res = await fetch(asset.image);
                                imageBlob = await res.blob();
                                const mimeType = imageBlob.type;
                                const extension = mimeType.split('/')[1] || 'png';
                                imageFileName += `.${extension}`;
                            } else {
                                // Handle URL/path
                                imageFileName += '.png'; // Default to PNG for URL images
                            }
                            
                            // Add image to zip using fetch for better memory handling
                            if (asset.image.startsWith('data:')) {
                                imagesFolder.file(imageFileName, imageBlob as Blob, { 
                                    compression: "DEFLATE", 
                                    compressionOptions: { level: 3 } 
                                });
                            } else {
                                // For URLs, fetch and stream directly to the zip
                                try {
                                    const response = await fetch(asset.image);
                                    const blob = await response.blob();
                                    imagesFolder.file(imageFileName, blob, {
                                        compression: "DEFLATE",
                                        compressionOptions: { level: 3 }
                                    });
                                } catch (error) {
                                    console.error(`Failed to fetch image for asset ${asset.id}:`, error);
                                    imagesFolder.file(imageFileName, 'Image fetch failed', { base64: false });
                                }
                            }
                        } else if (asset.image instanceof Blob) {
                            // Handle Blob directly
                            imageBlob = asset.image;
                            const mimeType = imageBlob.type;
                            const extension = mimeType.split('/')[1] || 'png';
                            imageFileName += `.${extension}`;
                            
                            imagesFolder.file(imageFileName, imageBlob, { 
                                compression: "DEFLATE", 
                                compressionOptions: { level: 3 } 
                            });
                        }
                        
                        // Update metadata with the correct image file name
                        const metadata = {
                            ...(asset.metadata || {}),
                            name: asset.metadata?.name || `NFT #${assetIndex + 1}`,
                            id: asset.id,
                            image: `images/${imageFileName}`,
                        };
                        
                        metadataFolder.file(metadataFileName, JSON.stringify(metadata, null, 2));
                        
                        // Clean up to free memory
                        imageBlob = null;
                        
                        // Update progress
                        const progress = Math.min(Math.round(((assetIndex + 1) / totalAssets) * 100), 99);
                        setExportStatus({
                            status: 'processing',
                            message: `Adding asset ${assetIndex + 1} of ${totalAssets}...`,
                            progress,
                        });
                        
                        // Allow UI to update by yielding execution
                        await new Promise(resolve => setTimeout(resolve, 0));
                    } catch (assetError) {
                        console.error(`Error processing asset ${asset.id}:`, assetError);
                    }
                }
            }
            
            setExportStatus({
                status: 'processing',
                message: 'Finalizing ZIP file...',
                progress: 99,
            });
            
            // Generate ZIP file with streaming support
            const zipBlob = await zip.generateAsync({ 
                type: 'blob',
                compression: "DEFLATE",
                compressionOptions: {
                    level: 3  // Lower compression level (0-9) for better performance
                },
                streamFiles: true  // Enable streaming for better memory usage
            }, (metadata) => {
                // Update progress while generating zip
                const zipProgress = Math.min(Math.round(metadata.percent), 99);
                setExportStatus({
                    status: 'processing',
                    message: `Generating ZIP: ${zipProgress}%`,
                    progress: zipProgress,
                });
            });
            
            saveAs(zipBlob, 'nft-collection.zip');
            
            setExportStatus({
                status: 'success',
                message: 'Your collection has been successfully exported!',
                progress: 100,
            });
            
            setTimeout(() => {
                handleExportComplete();
            }, 3000);
        } catch (error) {
            console.error('Export error:', error);
            setExportStatus({
                status: 'error',
                message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                progress: 0,
            });
        }
    };

    const handleExportIPFS = async () => {
        try {
            setIsExporting(true);
            setExportStatus({ 
                status: 'processing',
                message: 'Preparing files for upload...',
                progress: 0
            });

            const ipfsUploader = IPFSUploader.getInstance();
            
            // Format assets for upload
            const formattedAssets = generatedAssets.map(asset => ({
                image: asset.image,
                metadata: asset.metadata
            }));

            // Upload to IPFS with progress tracking
            const { baseUri, metadataUri } = await ipfsUploader.uploadCollection(
                formattedAssets as unknown as { image: Blob; metadata: NFTMetadata; }[],
                (current, total, status) => {
                    const progress = (current / total) * 100;
                    setExportStatus({
                        status: 'processing',
                        message: status,
                        progress: progress
                    });
                }
            );

            // Extract CID from baseUri
            const cid = baseUri.replace('ipfs://', '').replace('/', '');

            // Save metadata JSON with IPFS URLs
            const metadataWithIPFS = generatedAssets.map((asset, index) => ({
                ...asset.metadata,
                image: `${baseUri}${asset.id}.png`,
                metadata_url: `${metadataUri}${asset.id}.json`
            }));

            const metadataBlob = new Blob(
                [JSON.stringify(metadataWithIPFS, null, 2)],
                { type: 'application/json' }
            );
            saveAs(metadataBlob, 'collection-metadata.json');

            setExportStatus({ 
                status: 'success',
                message: 'Collection uploaded to IPFS successfully!',
                ipfsHash: cid
            });

            onComplete();

        } catch (error) {
            console.error('IPFS upload failed:', error);
            setExportStatus({ 
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to upload to IPFS. Please try again.'
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportComplete = () => {
        // Clear any stored data
        setExportStatus({ status: 'idle' });
        setIsExporting(false);
        // Clear any stored files
        if (window.URL) {
            generatedAssets.forEach(asset => {
                if (asset.image instanceof Blob) {
                    const url = URL.createObjectURL(asset.image);
                    URL.revokeObjectURL(url);
                }
            });
        }
        
        onComplete();
    };

    const handleImageDownload = async (asset: typeof generatedAssets[0]) => {
        try {
            let imageBlob: Blob;
            if (typeof asset.image === 'string') {
                if (asset.image.startsWith('data:')) {
                    // Fetch instead of directly using the data URL to reduce memory usage
                    const response = await fetch(asset.image);
                    imageBlob = await response.blob();
                } else {
                    throw new Error('Invalid image format');
                }
            } else {
                // Create a copy of the blob to avoid issues with ownership
                imageBlob = asset.image.slice(0, asset.image.size, asset.image.type);
            }
            
            // Determine the file extension based on the MIME type
            const imageType = imageBlob.type.split('/')[1] || 'png';
            saveAs(imageBlob, `nft-${asset.id}.${imageType}`);
            
            // After saving, if we created a new blob, clean it up
            imageBlob = null as any;
        } catch (error) {
            console.error('Failed to download image:', error);
        }
    };

    return (
        <div className={styles.exportAssets}>
            <div className={styles.header}>
                <h2>Export Collection</h2>
                <p>Choose how you want to export your generated collection</p>
            </div>

            <div className={styles.stats}>
                <div className={styles.statItem}>
                    <ImageIcon size={20} />
                    <span>Images Generated</span>
                    <strong>{generatedAssets.length}</strong>
                </div>
                <div className={styles.statItem}>
                    <FileJson size={20} />
                    <span>Metadata Files</span>
                    <strong>{generatedAssets.length}</strong>
                </div>
            </div>

            <div className={styles.formatSelection}>
                <h3>Export Format</h3>
                <div className={styles.formatOptions}>
                    <button
                        className={`${styles.formatOption} ${exportFormat === 'zip' ? styles.selected : ''}`}
                        onClick={() => setExportFormat('zip')}
                        disabled={isExporting}
                    >
                        <Archive size={24} />
                        <div>
                            <h4>Download ZIP</h4>
                            <p>Get a ZIP file containing all images and metadata</p>
                        </div>
                    </button>

                    <button
                        className={`${styles.formatOption} ${exportFormat === 'ipfs' ? styles.selected : ''}`}
                        onClick={() => setExportFormat('ipfs')}
                        disabled={isExporting}
                    >
                        <Upload size={24} />
                        <div>
                            <h4>Upload to IPFS</h4>
                            <p>Upload collection to IPFS and get CID</p>
                        </div>
                    </button>
                </div>
            </div>

            <div className={styles.previewGrid}>
                <h3>Generated Images {generatedAssets.length > 50 ? '(Showing first 50)' : ''}</h3>
                <div className={styles.grid}>
                    {generatedAssets.slice(0, 50).map((asset) => {
                        // Use a more memory-efficient way to get image URLs
                        const getImageUrl = () => {
                            if (typeof asset.image === 'string') {
                                return asset.image;
                            }
                            // Only create object URLs when necessary and don't store them
                            return URL.createObjectURL(asset.image);
                        };
                        
                        return (
                            <div key={asset.id} className={styles.previewItem}>
                                <img 
                                    src={getImageUrl()}
                                    alt={`NFT #${asset.id}`}
                                    onLoad={(e) => {
                                        // Release the object URL after the image loads
                                        const img = e.target as HTMLImageElement;
                                        if (img.src.startsWith('blob:')) {
                                            // Schedule URL revocation after a short delay to ensure rendering
                                            setTimeout(() => {
                                                URL.revokeObjectURL(img.src);
                                            }, 1000);
                                        }
                                    }}
                                />
                                <div className={styles.previewOverlay}>
                                    <button 
                                        onClick={() => handleImageDownload(asset)}
                                        className={styles.downloadButton}
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {generatedAssets.length > 50 && (
                    <div className={styles.moreInfo}>
                        <p>Showing only the first 50 images to improve performance. All {generatedAssets.length} images will be included in the export.</p>
                    </div>
                )}
            </div>

            {exportStatus.status !== 'idle' && (
                <div className={`${styles.status} ${styles[exportStatus.status]}`}>
                    {exportStatus.status === 'processing' ? (
                        <>
                            <div className={styles.spinner} />
                            <span>{exportStatus.message || 'Processing...'}</span>
                            {exportStatus.progress !== undefined && (
                                <div className={styles.progressBar}>
                                    <div 
                                        className={styles.progressFill}
                                        style={{ width: `${exportStatus.progress}%` }}
                                    />
                                </div>
                            )}
                        </>
                    ) : exportStatus.status === 'success' ? (
                        <div className={styles.successContent}>
                            <CheckCircle size={20} />
                            <span>{exportStatus.message}</span>
                            {exportStatus.ipfsHash && (
                                <IPFSLinks cid={exportStatus.ipfsHash} />
                            )}
                        </div>
                    ) : (
                        <>
                            <AlertCircle size={20} />
                            <span>{exportStatus.message}</span>
                        </>
                    )}
                </div>
            )}

            {!hideNavigation && (
                <div className={styles.actions}>
                    <button 
                        className={styles.backButton} 
                        onClick={onBack}
                    >
                        <ArrowLeft className={styles.buttonIcon} />
                        Back
                    </button>
                    <button
                        onClick={exportFormat === 'zip' ? handleExportZip : handleExportIPFS}
                        className={styles.exportButton}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>Processing...</>
                        ) : exportFormat === 'zip' ? (
                            <>
                                <Download size={18} />
                                Download Collection
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Upload to IPFS
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportAssets;