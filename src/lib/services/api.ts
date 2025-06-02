import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface Launch {
    id: string;
    name: string;
    description: string;
    bannerImage: string;
    profileImage: string;
    launchDate: string;
    mintPrice: string;
    totalSupply: number;
    creator: string;
    status: 'upcoming' | 'live' | 'ended';
    mintedCount?: number;
    verified?: boolean;
}

export const api = {
    launches: {
        getFeatured: async (): Promise<Launch[]> => {
            try {
                const response = await axios.get(`${API_BASE_URL}/launches/featured`);
                return response.data;
            } catch (error) {
                console.error('Error fetching featured launches:', error);
                throw error;
            }
        },

        getById: async (id: string): Promise<Launch> => {
            try {
                const response = await axios.get(`${API_BASE_URL}/launches/${id}`);
                return response.data;
            } catch (error) {
                console.error(`Error fetching launch ${id}:`, error);
                throw error;
            }
        }
    }
}; 