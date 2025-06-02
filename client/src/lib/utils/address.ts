import { ethers } from "ethers";

export function shortenAddress(address: string, chars = 4): string {
    if (!address) return '';
    return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}

export function isValidAddress(address: string): boolean {
    try {
        ethers.utils.getAddress(address);
        return true;
    } catch {
        return false;
    }
} 