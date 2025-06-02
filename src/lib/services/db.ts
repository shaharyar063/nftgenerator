import prisma from '@/lib/prisma';
import type { Launch } from '@prisma/client';

export const db = {
    launches: {
        getFeatured: async (): Promise<Launch[]> => {
            return await prisma.launch.findMany({
                where: {
                    featured: true,
                    OR: [
                        { status: 'upcoming' },
                        { status: 'live' }
                    ]
                },
                orderBy: {
                    launchDate: 'asc'
                },
                take: 5
            });
        },

        getById: async (id: string): Promise<Launch | null> => {
            return await prisma.launch.findUnique({
                where: { id }
            });
        },

        create: async (data: Omit<Launch, 'id' | 'createdAt' | 'updatedAt'>) => {
            return await prisma.launch.create({
                data
            });
        },

        update: async (id: string, data: Partial<Launch>) => {
            return await prisma.launch.update({
                where: { id },
                data
            });
        }
    }
};