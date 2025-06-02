import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Layers } from 'lucide-react';
import CollectionForm, { CollectionFormData } from '@/components/collection/CollectionForm';
import TraitUploader from '@/components/collection/TraitUploader';
import CollectionPreview from '@/components/collection/CollectionPreview';
import styles from '@/styles/pages/create/Generative.module.css';
import { CollectionGenerator } from '@/lib/services/CollectionGenerator';
import { IPFSUploader } from '@/lib/services/IPFSUploader';
import { GenerationProgress, TraitLayer } from '@/lib/types'; // Add this import

type Step = 'collection-details' | 'trait-upload' | 'preview-generate';

const GenerativeCollection = () => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>('collection-details');
    const [collectionData, setCollectionData] = useState<CollectionFormData | null>(null);
    // Update the Layer type to use TraitLayer
    const [layers, setLayers] = useState<TraitLayer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<{
        current: number;
        total: number;
        status: string;
    } | null>(null);

    const handleCollectionSubmit = async (data: CollectionFormData) => {
        setIsLoading(true);
        try {
            // Here you would typically save the collection data to your backend
            // For now, we'll just store it in state
            setCollectionData(data);
            setCurrentStep('trait-upload');
        } catch (error) {
            console.error('Error creating collection:', error);
            // Handle error (show toast notification, etc.)
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStep === 'trait-upload') {
            setCurrentStep('collection-details');
        } else {
            router.push('/create');
        }
    };

    const handleGenerate = async (settings: any) => {
        try {
            setIsLoading(true);
            
            // Initialize generator
            const generator = new CollectionGenerator(
                layers.map(layer => ({...layer, traits: [], required: true})),
                settings,
                collectionData!.supply,
                collectionData!.name,
                collectionData!.description
            );
            // Generate collection
            const generatedNFTs = await generator.generate((progress: GenerationProgress) => {
                setGenerationProgress(progress);
            });

            // Upload to IPFS
            const uploader = IPFSUploader.getInstance();
            const { metadataUri } = await uploader.uploadCollection(
                generatedNFTs,
                (current, total, status) => {
                    setGenerationProgress({ current, total, status });
                }
            );

            // Navigate to deployment page with the metadata URI
            router.push({
                pathname: '/deploy',
                query: {
                    name: collectionData!.name,
                    symbol: collectionData!.symbol,
                    supply: collectionData!.supply,
                    baseUri: metadataUri,
                    // Add any other necessary parameters
                }
            });

        } catch (error) {
            console.error('Generation failed:', error);
            // Show error toast/notification
        } finally {
            setIsLoading(false);
            setGenerationProgress(null);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={handleBack} className={styles.backButton}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <div className={styles.steps}>
                    <div className={`${styles.step} ${currentStep === 'collection-details' ? styles.active : ''}`}>
                        <span className={styles.stepNumber}>1</span>
                        Collection Details
                    </div>
                    <div className={`${styles.step} ${currentStep === 'trait-upload' ? styles.active : ''}`}>
                        <span className={styles.stepNumber}>2</span>
                        Upload Traits
                    </div>
                    <div className={`${styles.step} ${currentStep === 'preview-generate' ? styles.active : ''}`}>
                        <span className={styles.stepNumber}>3</span>
                        Preview & Generate
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {currentStep === 'collection-details' && (
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <Layers size={32} />
                            <h1>Create Generative Collection</h1>
                            <p>Start by providing basic details about your collection</p>
                        </div>
                        <CollectionForm 
                            onSubmit={handleCollectionSubmit}
                            isLoading={isLoading}
                        />
                    </div>
                )}
                {currentStep === 'trait-upload' && collectionData && (
                    <TraitUploader 
                        collectionData={collectionData}
                        onBack={() => setCurrentStep('collection-details')}
                        onNext={() => setCurrentStep('preview-generate')}
                        onLayersUpdate={setLayers} // Add this prop
                        existingLayers={layers} // Add this prop
                    />
                )}


{currentStep === 'preview-generate' && collectionData && (
                    <CollectionPreview
                        collectionData={collectionData}
                        layers={layers}
                        onBack={() => setCurrentStep('trait-upload')}
                        onGenerate={handleGenerate}
                    />
                )}
            </div>
        </div>
    );
};

export default GenerativeCollection; 