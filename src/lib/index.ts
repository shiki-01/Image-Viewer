import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { setUrls, urls as existingUrls } from './store';

async function isValidImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

function encryptUrl(url: string, userId: string): string {
    const key = CryptoJS.SHA256(userId).toString();
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(url, CryptoJS.enc.Hex.parse(key), { iv: iv }).toString();
    return iv.toString() + ':' + encrypted;
}

function decryptUrl(encryptedUrl: string, userId: string): string {
    const [ivHex, encrypted] = encryptedUrl.split(':');
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const key = CryptoJS.SHA256(userId).toString();
    return CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Hex.parse(key), { iv: iv }).toString(CryptoJS.enc.Utf8);
}

async function fetchAndDecryptUrls(userId: string): Promise<string[]> {
    const docRef = doc(db, `users/${userId}/`);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const encryptedUrls = docSnap.data().urls || [];
            return encryptedUrls.map((url: string) => decryptUrl(url, userId));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching from Firestore:', error);
        return [];
    }
}

export async function addImages(userId: string | null, urls: string[]): Promise<{ url: string, success: boolean }[]> {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const existingDecryptedUrls = await fetchAndDecryptUrls(userId);

    const results = await Promise.all(
        urls.map(async (url) => {
            const isValid = await isValidImageUrl(url);
            if (isValid && !existingDecryptedUrls.includes(url)) {
                const encryptedUrl = encryptUrl(url, userId);
                if (encryptedUrl && !existingUrls.includes(encryptedUrl)) {
                    existingUrls.push(encryptedUrl);
                    return { url, success: true };
                }
            }
            return { url, success: false };
        })
    );

    if (results.some(result => result.success)) {
        const allUrls = [...existingDecryptedUrls, ...urls.filter(url => results.find(result => result.url === url && result.success))];
        const encryptedAllUrls = allUrls.map(url => encryptUrl(url, userId));
        const docRef = doc(db, `users/${userId}/`);
        try {
            await setDoc(docRef, { urls: encryptedAllUrls }, { merge: true });
            setUrls(encryptedAllUrls);
        } catch (error) {
            console.error('Error writing to Firestore:', error);
        }
    }

    return results;
}

export async function writeUrlsToStore(userId: string) {
    const decryptedUrls = await fetchAndDecryptUrls(userId);
    setUrls(decryptedUrls);
}

export async function removeImages(userId: string | null, urlsToRemove: string[]): Promise<void> {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const existingDecryptedUrls = await fetchAndDecryptUrls(userId);

    const updatedUrls = existingDecryptedUrls.filter(url => !urlsToRemove.includes(url));
    const encryptedUpdatedUrls = updatedUrls.map(url => encryptUrl(url, userId));

    const docRef = doc(db, `users/${userId}/`);
    try {
        await setDoc(docRef, { urls: encryptedUpdatedUrls }, { merge: true });
        setUrls(encryptedUpdatedUrls);
    } catch (error) {
        console.error('Error writing to Firestore:', error);
    }
}